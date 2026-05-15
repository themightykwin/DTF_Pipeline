import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getShopifyClient } from '@/lib/shopify';

// ── GraphQL mutations ─────────────────────────────────────────────────────────

const CREATE_PRODUCT = `#graphql
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        variants(first: 100) {
          edges {
            node {
              id
              title
              selectedOptions { name value }
            }
          }
        }
      }
      userErrors { field message }
    }
  }`;

const UPDATE_VARIANT_PRICE = `#graphql
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price }
      userErrors { field message }
    }
  }`;

const ATTACH_IMAGE = `#graphql
  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media { ... on MediaImage { id image { url } } }
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

// ── POST /api/products/sync ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { shopDomain, configurationId } = await req.json() as {
      shopDomain: string;
      configurationId: string;
    };

    // 1. Load shop
    const shop = await prisma.shop.findUnique({ where: { shopDomain } });
    if (!shop) {
      return NextResponse.json(
        { ok: false, error: { code: 'SHOP_NOT_FOUND', message: 'Shop not found.' } },
        { status: 404 }
      );
    }

    // 2. Load config with all relations
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

    // 3. Parse config inputs to get selected colors + quantities
    type ConfigInputs = {
      selectedColors?: string[];
      quantities?: Record<string, Record<string, number>>;
      front?: { transform?: Record<string, number> };
      back?: { transform?: Record<string, number> };
    };
    let inputs: ConfigInputs = {};
    try {
      const parsed = JSON.parse(config.configJson) as { inputs?: ConfigInputs };
      inputs = parsed.inputs ?? {};
    } catch {}

    const selectedColors: string[] = inputs.selectedColors ?? [];
    const quantities: Record<string, Record<string, number>> = inputs.quantities ?? {};
    const basePriceCents = config.catalogProduct?.basePriceCents ?? config.priceSnapshot
      ? Math.round((config.priceSnapshot ?? 0) * 100)
      : 1500; // fallback $15

    // Build variant options: one per color×size that has qty > 0
    type VariantDef = { color: string; size: string; qty: number };
    const variantDefs: VariantDef[] = [];
    for (const color of selectedColors) {
      const sizeMap = quantities[color] ?? {};
      for (const [size, qty] of Object.entries(sizeMap)) {
        if (qty > 0) variantDefs.push({ color, size, qty });
      }
    }

    // If already synced AND variants haven't changed, return existing
    if (config.shopifyProduct) {
      return NextResponse.json({
        ok: true,
        data: {
          configurationId,
          shopifyProductId: config.shopifyProduct.shopifyProductId,
          shopifyVariantId: config.shopifyProduct.shopifyVariantId,
          variantMap: JSON.parse((config.shopifyProduct as unknown as { variantMapJson?: string }).variantMapJson ?? '{}'),
          status: 'existing',
        },
      });
    }

    const client = getShopifyClient(shopDomain, shop.accessTokenEncrypted);

    // 4. Build variant input list
    // Each variant gets Color + Size options
    const variants = variantDefs.map(({ color, size }) => ({
      options: [color, size],
      price: (basePriceCents / 100).toFixed(2),
      inventoryPolicy: 'CONTINUE',
    }));

    // If no variants defined yet (design saved before qty entered), create a single default
    const productVariants = variants.length > 0 ? variants : [
      { options: ['Default', 'One Size'], price: (basePriceCents / 100).toFixed(2), inventoryPolicy: 'CONTINUE' },
    ];

    // 5. Create the Shopify product
    const shortId = configurationId.slice(0, 8);
    const garmentLabel = config.garmentTemplate.label;
    const productTitle = config.catalogProduct?.title
      ? `${config.catalogProduct.title} — Custom DTF #${shortId}`
      : `Custom ${garmentLabel} — #${shortId}`;

    const productResult = await client.request(CREATE_PRODUCT, {
      variables: {
        input: {
          title: productTitle,
          productType: config.garmentTemplate.garmentType,
          vendor: 'DTF Pipeline',
          status: 'ACTIVE',
          tags: [`dtf_pipeline`, `config:${configurationId}`, `user:${config.userId}`],
          options: ['Color', 'Size'],
          variants: productVariants,
        },
      },
    }) as {
      data: {
        productCreate: {
          product: {
            id: string;
            variants: { edges: { node: { id: string; title: string; selectedOptions: { name: string; value: string }[] } }[] };
          };
          userErrors: { field: string; message: string }[];
        };
      };
    };

    const createErrors = productResult.data?.productCreate?.userErrors;
    if (createErrors?.length) {
      return NextResponse.json(
        { ok: false, error: { code: 'SHOPIFY_USER_ERROR', message: createErrors[0].message } },
        { status: 422 }
      );
    }

    const shopifyProduct = productResult.data.productCreate.product;
    const shopifyProductId = shopifyProduct.id;

    // Build a map: "Color|Size" → variantId  (and grab the first variantId as default)
    const variantMap: Record<string, string> = {};
    let firstVariantId = '';
    for (const edge of shopifyProduct.variants.edges) {
      const node = edge.node;
      const color = node.selectedOptions.find((o) => o.name === 'Color')?.value ?? '';
      const size = node.selectedOptions.find((o) => o.name === 'Size')?.value ?? '';
      variantMap[`${color}|${size}`] = node.id;
      if (!firstVariantId) firstVariantId = node.id;
    }

    // 6. Attach artwork image (Cloudinary URL) to the product
    const artworkUrl = config.artUpload?.storageUrl ?? config.catalogProduct?.images[0]?.storageUrl;
    if (artworkUrl) {
      await client.request(ATTACH_IMAGE, {
        variables: {
          productId: shopifyProductId,
          media: [{ mediaContentType: 'IMAGE', originalSource: artworkUrl }],
        },
      });
    }

    // 7. Set metafields for traceability
    await client.request(SET_METAFIELD, {
      variables: {
        metafields: [
          {
            ownerId: shopifyProductId,
            namespace: 'dtf_pipeline',
            key: 'configuration_id',
            value: configurationId,
            type: 'single_line_text_field',
          },
          {
            ownerId: shopifyProductId,
            namespace: 'dtf_pipeline',
            key: 'user_id',
            value: config.userId,
            type: 'single_line_text_field',
          },
        ],
      },
    });

    // 8. Persist the ShopifyProduct record
    await prisma.shopifyProduct.create({
      data: {
        shopId: shop.id,
        configurationId,
        shopifyProductId,
        shopifyVariantId: firstVariantId,
        visibilityStatus: 'active',
        // Store full variant map as metafield JSON in the DB
        ...(Object.keys(variantMap).length > 0
          ? { metafieldKey: JSON.stringify(variantMap) }
          : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        configurationId,
        shopifyProductId,
        shopifyVariantId: firstVariantId,
        variantMap,
        status: 'synced',
      },
    });
  } catch (e) {
    console.error('[/api/products/sync]', e);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: 'Internal error.' } },
      { status: 500 }
    );
  }
}
