import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getShopifyClient } from '@/lib/shopify';

const DRAFT_ORDER_CREATE = `#graphql
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        invoiceUrl
        totalPrice
        status
      }
      userErrors { field message }
    }
  }`;

export async function POST(req: NextRequest) {
  try {
    const { shopDomain, configurationId, shopifyCustomerId, shippingAddress } =
      await req.json() as {
        shopDomain: string;
        configurationId: string;
        shopifyCustomerId: string;
        shippingAddress: Record<string, string>;
      };

    const shop = await prisma.shop.findUnique({ where: { shopDomain } });
    if (!shop) return NextResponse.json({ ok: false, error: { code: 'SHOP_NOT_FOUND', message: 'Shop not found.' } }, { status: 404 });

    const config = await prisma.productConfiguration.findUnique({
      where: { id: configurationId },
      include: { shopifyProduct: true, garmentTemplate: true },
    });
    if (!config?.shopifyProduct) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_SYNCED', message: 'Configuration not synced to Shopify yet. Call /api/products/sync first.' } }, { status: 422 });
    }

    const client = getShopifyClient(shopDomain, shop.accessTokenEncrypted);

    const result = await client.request(DRAFT_ORDER_CREATE, {
      variables: {
        input: {
          customerId: shopifyCustomerId,
          lineItems: [{
            variantId: config.shopifyProduct.shopifyVariantId,
            quantity: 1,
            appliedDiscount: null,
          }],
          shippingAddress,
          note: `DTF Pipeline order — config:${configurationId}`,
          tags: [`dtf_pipeline`, `config:${configurationId}`],
        },
      },
    }) as { data: { draftOrderCreate: { draftOrder: { id: string; invoiceUrl: string; totalPrice: string; status: string }; userErrors: { message: string }[] } } };

    const userErrors = result.data?.draftOrderCreate?.userErrors;
    if (userErrors?.length) {
      return NextResponse.json({ ok: false, error: { code: 'SHOPIFY_USER_ERROR', message: userErrors[0].message } }, { status: 422 });
    }

    const draftOrder = result.data.draftOrderCreate.draftOrder;

    // Find userId from the shop customer mapping
    const shopCustomer = await prisma.shopCustomer.findFirst({
      where: { shopId: shop.id, shopifyCustomerId },
    });

    const localDraft = await prisma.draftOrder.create({
      data: {
        shopId: shop.id,
        userId: shopCustomer?.userId ?? config.userId,
        configurationId,
        shopifyDraftOrderId: draftOrder.id,
        invoiceUrl: draftOrder.invoiceUrl,
        totalPrice: parseFloat(draftOrder.totalPrice),
        status: 'open',
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        draftOrderId: localDraft.id,
        shopifyDraftOrderId: draftOrder.id,
        invoiceUrl: draftOrder.invoiceUrl,
        status: localDraft.status,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Internal error.' } }, { status: 500 });
  }
}
