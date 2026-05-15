import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getShopifyClient } from '@/lib/shopify';
import { fetchClientCredentialsToken } from '@/lib/shopify-token';

const CREATE_PRODUCT = `#graphql
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        variants(first: 100) {
          edges {
            node {
              id
              selectedOptions { name value }
            }
          }
        }
      }
      userErrors { field message }
    }
  }`;

const ATTACH_IMAGE = `#graphql
  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media { ... on MediaImage { id } }
      mediaUserErrors { field message }
    }
  }`;

const SET_METAFIELD = `#graphql
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key value }
      userErrors { field message }
    }
  }`;

export async function POST(req: NextRequest) {
  try {
    const { shopDomain, configurationId } = await req.json() as {
      shopDomain: string;
      configurationId: string;
    };

    console.log('[sync] shopDomain:', shopDomain, 'configurationId:', configurationId);

    // 1. Load shop (use findFirst — shopDomain is not the PK)
    const shop = await prisma.shop.findFirst({ where: { shopDomain, isActive: true } });
    if (!shop) {
      console.error('[sync] shop not found:', shopDomain);
      return NextResponse.json(
        { ok: false, error: { code: 'SHOP_NOT_FOUND', message: `Shop ${shopDomain} not found.` } },
        { status: 404 }
      );
    }

    // 2. Load config
    const config = await prisma.productConfiguration.findUnique({
      where: { id: configurationId },
      include: {
        garmentTemplate: true,
        artUpload: true,
        catalogProduct: {
          include: { images: { where: { isFeatured: true }, take: 1 } },
        },
        shopifyProduct: true,
      },
    });
    if (!config) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Configuration not found.' } },
        { status: 404 }
      );
    }

    console.log('[sync] config loaded, garmentType:', config.garmentTemplate?.garmentType);

    // 3. Return early if already synced — parse variantMap from metafieldNamespace
    if (config.shopifyProduct) {
      let variantMap: Record<string, string> = {};
      try { variantMap = JSON.parse(config.shopifyProduct.metafieldNamespace); } catch {}
      console.log('[sync] already synced, returning existing');
      return NextResponse.json({
        ok: true,
        data: {
          configurationId,
          shopifyProductId: config.shopifyProduct.shopifyProductId,
          shopifyVariantId: config.shopifyProduct.shopifyVariantId,
          variantMap,
          status: 'existing',
        },
      });
    }

    // 4. Parse configJson to get colors + quantities saved at config time
    type ConfigInputs = {
      selectedColors?: string[];
      quantities?: Record<string, Record<string, number>>;
    };
    let inputs: ConfigInputs = {};
    try {
      const parsed = JSON.parse(config.configJson ?? '{}') as { inputs?: ConfigInputs };
      inputs = parsed.inputs ?? {};
    } catch {}

    const savedColors: string[] = inputs.selectedColors ?? [];
    const savedQuantities: Record<string, Record<string, number>> = inputs.quantities ?? {};

    console.log('[sync] savedColors:', savedColors, 'savedQuantities:', JSON.stringify(savedQuantities));

    // 5. Determine base price
    const basePriceCents: number = (() => {
      if (config.catalogProduct?.basePriceCents && config.catalogProduct.basePriceCents > 0) {
        return config.catalogProduct.basePriceCents;
      }
      if (config.priceSnapshot && config.priceSnapshot > 0) {
        return Math.round(config.priceSnapshot * 100);
      }
      return 1500; // $15 fallback
    })();
    const priceStr = (basePriceCents / 100).toFixed(2);

    // 6. Build variants from saved quantities
    //    Use Object.keys(savedQuantities) as color source (same logic as checkout)
    const effectiveColors = Object.keys(savedQuantities).length > 0
      ? Object.keys(savedQuantities)
      : savedColors;

    type VariantInput = { options: [string, string]; price: string; inventoryPolicy: string };
    const variantInputs: VariantInput[] = [];

    for (const color of effectiveColors) {
      const sizeMap = savedQuantities[color] ?? {};
      for (const [size, qty] of Object.entries(sizeMap)) {
        if (qty > 0) {
          variantInputs.push({ options: [color, size], price: priceStr, inventoryPolicy: 'CONTINUE' });
        }
      }
    }

    // If no variants with qty > 0, create one default variant per color (or a single default)
    if (variantInputs.length === 0) {
      if (effectiveColors.length > 0) {
        for (const color of effectiveColors) {
          const rawSizes = config.garmentTemplate?.availableSizes;
          const sizes: string[] = Array.isArray(rawSizes) ? (rawSizes as string[]) : ['M'];
          variantInputs.push({ options: [color, sizes[0]], price: priceStr, inventoryPolicy: 'CONTINUE' });
        }
      } else {
        variantInputs.push({ options: ['Default', 'One Size'], price: priceStr, inventoryPolicy: 'CONTINUE' });
      }
    }

    console.log('[sync] variantInputs:', JSON.stringify(variantInputs));

    // 7. Create Shopify product
    // Always refresh token via client credentials — tokens expire in 24h
    let adminToken = shop.accessTokenEncrypted;
    try {
      const fresh = await fetchClientCredentialsToken(shopDomain);
      adminToken = fresh;
      // Persist updated token
      await prisma.shop.update({ where: { id: shop.id }, data: { accessTokenEncrypted: fresh } });
    } catch (refreshErr) {
      console.warn('[sync] token refresh failed, using stored token:', refreshErr);
    }
    const client = getShopifyClient(shopDomain, adminToken);
    const shortId = configurationId.slice(0, 8);
    const productTitle = config.catalogProduct?.title
      ? `${config.catalogProduct.title} — DTF #${shortId}`
      : `Custom ${config.garmentTemplate?.label ?? 'Garment'} — #${shortId}`;

    const productResult = await client.request(CREATE_PRODUCT, {
      variables: {
        input: {
          title: productTitle,
          productType: config.garmentTemplate?.garmentType ?? 'tshirt',
          vendor: 'DTF Pipeline',
          status: 'ACTIVE',
          tags: [`dtf_pipeline`, `config:${configurationId}`],
          options: ['Color', 'Size'],
          variants: variantInputs,
        },
      },
    }) as {
      data: {
        productCreate: {
          product: {
            id: string;
            variants: { edges: { node: { id: string; selectedOptions: { name: string; value: string }[] } }[] };
          };
          userErrors: { field: string; message: string }[];
        };
      };
    };

    // Check for top-level errors (auth failures come back here, not in userErrors)
    const topErrors = (productResult as unknown as { errors?: { message: string }[] }).errors;
    if (topErrors?.length) {
      console.error('[sync] Shopify top-level errors:', topErrors);
      return NextResponse.json(
        { ok: false, error: { code: 'SHOPIFY_AUTH_ERROR', message: `Shopify API error: ${topErrors[0].message}` } },
        { status: 401 }
      );
    }

    const createErrors = productResult.data?.productCreate?.userErrors;
    if (createErrors?.length) {
      console.error('[sync] productCreate userErrors:', createErrors);
      return NextResponse.json(
        { ok: false, error: { code: 'SHOPIFY_USER_ERROR', message: createErrors[0].message } },
        { status: 422 }
      );
    }

    const shopifyProduct = productResult.data?.productCreate?.product;
    if (!shopifyProduct) {
      console.error('[sync] productCreate returned no product — full result:', JSON.stringify(productResult));
      return NextResponse.json(
        { ok: false, error: { code: 'NO_PRODUCT', message: 'Shopify returned no product. The Admin API token may be invalid — ensure it starts with shpat_ and has write_products scope.' } },
        { status: 500 }
      );
    }

    const shopifyProductId = shopifyProduct.id;
    console.log('[sync] created shopifyProductId:', shopifyProductId);

    // 8. Build variant map: "Color|Size" → GID
    const variantMap: Record<string, string> = {};
    let firstVariantId = '';
    for (const { node } of shopifyProduct.variants.edges) {
      const color = node.selectedOptions.find(o => o.name === 'Color')?.value ?? '';
      const size = node.selectedOptions.find(o => o.name === 'Size')?.value ?? '';
      variantMap[`${color}|${size}`] = node.id;
      if (!firstVariantId) firstVariantId = node.id;
    }

    console.log('[sync] variantMap:', JSON.stringify(variantMap), '| firstVariantId:', firstVariantId);

    // 9. Attach artwork image
    const artworkUrl = config.artUpload?.storageUrl ?? config.catalogProduct?.images[0]?.storageUrl;
    if (artworkUrl) {
      try {
        await client.request(ATTACH_IMAGE, {
          variables: { productId: shopifyProductId, media: [{ mediaContentType: 'IMAGE', originalSource: artworkUrl }] },
        });
      } catch (imgErr) {
        console.warn('[sync] image attach failed (non-fatal):', imgErr);
      }
    }

    // 10. Set metafield for traceability
    try {
      await client.request(SET_METAFIELD, {
        variables: {
          metafields: [{
            ownerId: shopifyProductId,
            namespace: 'dtf_pipeline',
            key: 'configuration_id',
            value: configurationId,
            type: 'single_line_text_field',
          }],
        },
      });
    } catch (mfErr) {
      console.warn('[sync] metafield set failed (non-fatal):', mfErr);
    }

    // 11. Persist ShopifyProduct record
    //     Store variantMap JSON in metafieldNamespace (repurposed — schema has no variantMap column)
    await prisma.shopifyProduct.create({
      data: {
        shopId: shop.id,
        configurationId,
        shopifyProductId,
        shopifyVariantId: firstVariantId,
        metafieldNamespace: JSON.stringify(variantMap), // ← variant map storage
        metafieldKey: 'configuration_id',
        visibilityStatus: 'active',
      },
    });

    return NextResponse.json({
      ok: true,
      data: { configurationId, shopifyProductId, shopifyVariantId: firstVariantId, variantMap, status: 'synced' },
    });

  } catch (e) {
    console.error('[/api/products/sync] exception:', e);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: e instanceof Error ? e.message : 'Internal error.' } },
      { status: 500 }
    );
  }
}
