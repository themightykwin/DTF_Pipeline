/**
 * POST /api/products/sync
 *
 * Syncs a ProductConfiguration to Shopify using the 2026-01 API pattern:
 * 1. productCreate (title/status/vendor only — no options/variants in input)
 * 2. productOptionsCreate (Color + Size options with all values)
 * 3. productVariantsBulkCreate (one variant per color×size with qty > 0)
 * 4. productCreateMedia (attach artwork image)
 * 5. Persist ShopifyProduct record in DB
 *
 * Token is refreshed via client credentials on every call (expires in 24h).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getShopifyClient } from '@/lib/shopify';
import { fetchClientCredentialsToken } from '@/lib/shopify-token';

// ── GraphQL ────────────────────────────────────────────────────────────────────

const CREATE_PRODUCT = `#graphql
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product { id }
      userErrors { field message }
    }
  }`;

const CREATE_OPTIONS = `#graphql
  mutation productOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!) {
    productOptionsCreate(productId: $productId, options: $options) {
      product { options { id name } }
      userErrors { field message code }
    }
  }`;

const BULK_CREATE_VARIANTS = `#graphql
  mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants {
        id
        selectedOptions { name value }
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

// ── POST /api/products/sync ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { shopDomain, configurationId } = await req.json() as {
      shopDomain: string;
      configurationId: string;
    };

    console.log('[sync] shopDomain:', shopDomain, '| configurationId:', configurationId);

    // 1. Load shop
    const shop = await prisma.shop.findFirst({ where: { shopDomain, isActive: true } });
    if (!shop) {
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
        catalogProduct: { include: { images: { where: { isFeatured: true }, take: 1 } } },
        shopifyProduct: true,
      },
    });
    if (!config) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Configuration not found.' } },
        { status: 404 }
      );
    }

    // 3. Return early if already synced
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

    // 4. Parse configJson
    type ConfigInputs = {
      selectedColors?: string[];
      quantities?: Record<string, Record<string, number>>;
    };
    let inputs: ConfigInputs = {};
    try {
      const parsed = JSON.parse(config.configJson ?? '{}') as { inputs?: ConfigInputs };
      inputs = parsed.inputs ?? {};
    } catch {}

    const savedQuantities: Record<string, Record<string, number>> = inputs.quantities ?? {};
    const savedColors: string[] = inputs.selectedColors ?? [];
    const effectiveColors = Object.keys(savedQuantities).length > 0
      ? Object.keys(savedQuantities)
      : savedColors;

    console.log('[sync] effectiveColors:', effectiveColors, '| quantities:', JSON.stringify(savedQuantities));

    // 5. Determine base price
    const basePriceCents = config.catalogProduct?.basePriceCents > 0
      ? config.catalogProduct.basePriceCents
      : config.priceSnapshot && config.priceSnapshot > 0
        ? Math.round(config.priceSnapshot * 100)
        : 1500;
    const priceStr = (basePriceCents / 100).toFixed(2);

    // 6. Collect unique colors + sizes that have qty > 0
    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();
    type VariantDef = { color: string; size: string };
    const variantDefs: VariantDef[] = [];

    for (const color of effectiveColors) {
      const sizeMap = savedQuantities[color] ?? {};
      for (const [size, qty] of Object.entries(sizeMap)) {
        if (qty > 0) {
          colorSet.add(color);
          sizeSet.add(size);
          variantDefs.push({ color, size });
        }
      }
    }

    // Fallback if no qty was set at save time
    if (colorSet.size === 0) {
      for (const c of effectiveColors) colorSet.add(c);
      const defaultSizes = (config.garmentTemplate?.availableSizes as string[] | undefined) ?? ['S', 'M', 'L', 'XL'];
      for (const s of defaultSizes) sizeSet.add(s);
      for (const c of colorSet) for (const s of sizeSet) variantDefs.push({ color: c, size: s });
    }

    console.log('[sync] colors:', [...colorSet], '| sizes:', [...sizeSet], '| variants:', variantDefs.length);

    // 7. Refresh Admin API token
    let adminToken = shop.accessTokenEncrypted;
    try {
      const fresh = await fetchClientCredentialsToken(shopDomain);
      adminToken = fresh;
      await prisma.shop.update({ where: { id: shop.id }, data: { accessTokenEncrypted: fresh } });
      console.log('[sync] token refreshed');
    } catch (e) {
      console.warn('[sync] token refresh failed, using stored token:', e);
    }

    const client = getShopifyClient(shopDomain, adminToken);
    const shortId = configurationId.slice(0, 8);
    const productTitle = config.catalogProduct?.title
      ? `${config.catalogProduct.title} — DTF #${shortId}`
      : `Custom ${config.garmentTemplate?.label ?? 'Garment'} — #${shortId}`;

    // 8. Step 1 — Create product (no options/variants in 2026-01)
    const createResult = await client.request(CREATE_PRODUCT, {
      variables: {
        input: {
          title: productTitle,
          vendor: 'DTF Pipeline',
          status: 'ACTIVE',
          tags: [`dtf_pipeline`, `config:${configurationId}`],
        },
      },
    }) as { data: { productCreate: { product: { id: string } | null; userErrors: { field: string; message: string }[] } } };

    const createErrors = createResult.data?.productCreate?.userErrors;
    if (createErrors?.length) {
      console.error('[sync] productCreate userErrors:', createErrors);
      return NextResponse.json(
        { ok: false, error: { code: 'SHOPIFY_ERROR', message: createErrors[0].message } },
        { status: 422 }
      );
    }
    const shopifyProductId = createResult.data?.productCreate?.product?.id;
    if (!shopifyProductId) {
      console.error('[sync] no product id returned:', JSON.stringify(createResult));
      return NextResponse.json(
        { ok: false, error: { code: 'NO_PRODUCT', message: 'productCreate returned no product id.' } },
        { status: 500 }
      );
    }
    console.log('[sync] created product:', shopifyProductId);

    // 9. Step 2 — Create Color + Size options
    const optionsResult = await client.request(CREATE_OPTIONS, {
      variables: {
        productId: shopifyProductId,
        options: [
          { name: 'Color', values: [...colorSet].map(name => ({ name })) },
          { name: 'Size',  values: [...sizeSet].map(name => ({ name })) },
        ],
      },
    }) as { data: { productOptionsCreate: { product: { options: { id: string; name: string }[] }; userErrors: { message: string }[] } } };

    const optErrors = optionsResult.data?.productOptionsCreate?.userErrors;
    if (optErrors?.length) {
      console.error('[sync] productOptionsCreate errors:', optErrors);
      return NextResponse.json(
        { ok: false, error: { code: 'OPTIONS_ERROR', message: optErrors[0].message } },
        { status: 422 }
      );
    }

    const opts = optionsResult.data?.productOptionsCreate?.product?.options ?? [];
    const colorOptId = opts.find(o => o.name === 'Color')?.id ?? '';
    const sizeOptId  = opts.find(o => o.name === 'Size')?.id ?? '';
    console.log('[sync] options created — colorOptId:', colorOptId, 'sizeOptId:', sizeOptId);

    // 10. Step 3 — Bulk create variants
    const variantsResult = await client.request(BULK_CREATE_VARIANTS, {
      variables: {
        productId: shopifyProductId,
        variants: variantDefs.map(({ color, size }) => ({
          optionValues: [
            { optionId: colorOptId, name: color },
            { optionId: sizeOptId,  name: size },
          ],
          price: priceStr,
          inventoryPolicy: 'CONTINUE',
        })),
      },
    }) as {
      data: {
        productVariantsBulkCreate: {
          productVariants: { id: string; selectedOptions: { name: string; value: string }[] }[];
          userErrors: { message: string }[];
        };
      };
    };

    const variantErrors = variantsResult.data?.productVariantsBulkCreate?.userErrors;
    if (variantErrors?.length) {
      console.error('[sync] productVariantsBulkCreate errors:', variantErrors);
      return NextResponse.json(
        { ok: false, error: { code: 'VARIANTS_ERROR', message: variantErrors[0].message } },
        { status: 422 }
      );
    }

    // Build variantMap: "Color|Size" → GID
    const variantMap: Record<string, string> = {};
    let firstVariantId = '';
    for (const v of variantsResult.data?.productVariantsBulkCreate?.productVariants ?? []) {
      const color = v.selectedOptions.find(o => o.name === 'Color')?.value ?? '';
      const size  = v.selectedOptions.find(o => o.name === 'Size')?.value ?? '';
      variantMap[`${color}|${size}`] = v.id;
      if (!firstVariantId) firstVariantId = v.id;
    }
    console.log('[sync] variantMap:', JSON.stringify(variantMap));

    // 11. Step 4 — Attach artwork image (non-fatal)
    const artworkUrl = config.artUpload?.storageUrl ?? config.catalogProduct?.images[0]?.storageUrl;
    if (artworkUrl) {
      try {
        await client.request(ATTACH_IMAGE, {
          variables: { productId: shopifyProductId, media: [{ mediaContentType: 'IMAGE', originalSource: artworkUrl }] },
        });
      } catch (e) {
        console.warn('[sync] image attach failed (non-fatal):', e);
      }
    }

    // 12. Persist ShopifyProduct record
    //     Store variantMap JSON in metafieldNamespace (no dedicated column in schema)
    await prisma.shopifyProduct.create({
      data: {
        shopId: shop.id,
        configurationId,
        shopifyProductId,
        shopifyVariantId: firstVariantId,
        metafieldNamespace: JSON.stringify(variantMap),
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
