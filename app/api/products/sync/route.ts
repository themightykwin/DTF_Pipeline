import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getShopifyClient } from '@/lib/shopify';

const CREATE_PRODUCT = `#graphql
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        variants(first: 1) { edges { node { id } } }
      }
      userErrors { field message }
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
    const { shopDomain, configurationId } = await req.json() as { shopDomain: string; configurationId: string };

    const shop = await prisma.shop.findUnique({ where: { shopDomain } });
    if (!shop) return NextResponse.json({ ok: false, error: { code: 'SHOP_NOT_FOUND', message: 'Shop not found.' } }, { status: 404 });

    const config = await prisma.productConfiguration.findUnique({
      where: { id: configurationId },
      include: { garmentTemplate: true, artUpload: true, shopifyProduct: true },
    });
    if (!config) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Configuration not found.' } }, { status: 404 });

    // Reuse existing Shopify product if already synced
    if (config.shopifyProduct) {
      return NextResponse.json({
        ok: true,
        data: {
          configurationId,
          shopifyProductId: config.shopifyProduct.shopifyProductId,
          shopifyVariantId: config.shopifyProduct.shopifyVariantId,
          status: 'existing',
        },
      });
    }

    const client = getShopifyClient(shopDomain, shop.accessTokenEncrypted);
    const inputs = JSON.parse(config.configJson) as Record<string, unknown>;

    const productResult = await client.request(CREATE_PRODUCT, {
      variables: {
        input: {
          title: `Custom ${config.garmentTemplate.label} — ${configurationId.slice(0, 8)}`,
          productType: config.garmentTemplate.garmentType,
          tags: [`dtf_pipeline`, `config:${configurationId}`, `user:${config.userId}`],
          status: 'DRAFT',
        },
      },
    }) as { data: { productCreate: { product: { id: string; variants: { edges: { node: { id: string } }[] } }; userErrors: { message: string }[] } } };

    const userErrors = productResult.data?.productCreate?.userErrors;
    if (userErrors?.length) {
      return NextResponse.json({ ok: false, error: { code: 'SHOPIFY_USER_ERROR', message: userErrors[0].message } }, { status: 422 });
    }

    const shopifyProductId = productResult.data.productCreate.product.id;
    const shopifyVariantId = productResult.data.productCreate.product.variants.edges[0].node.id;

    await client.request(SET_METAFIELD, {
      variables: {
        metafields: [
          { ownerId: shopifyProductId, namespace: 'dtf_pipeline', key: 'configuration_id', value: configurationId, type: 'single_line_text_field' },
          { ownerId: shopifyProductId, namespace: 'dtf_pipeline', key: 'user_id', value: config.userId, type: 'single_line_text_field' },
        ],
      },
    });

    const shopifyProduct = await prisma.shopifyProduct.create({
      data: {
        shopId: shop.id,
        configurationId,
        shopifyProductId,
        shopifyVariantId,
        visibilityStatus: 'hidden',
      },
    });

    return NextResponse.json({
      ok: true,
      data: { configurationId, shopifyProductId, shopifyVariantId, status: 'synced' },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Internal error.' } }, { status: 500 });
  }
}
