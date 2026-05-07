import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookHmac } from '@/lib/hmac';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const hmac = req.headers.get('x-shopify-hmac-sha256') ?? '';
  const shopDomain = req.headers.get('x-shopify-shop-domain') ?? '';
  const eventId = req.headers.get('x-shopify-webhook-id') ?? '';

  if (!verifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = JSON.parse(rawBody.toString()) as { id: number; financial_status?: string; fulfillment_status?: string };
  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop) return NextResponse.json({ ok: true });

  await prisma.order.updateMany({
    where: { shopifyOrderId: String(payload.id), shopId: shop.id },
    data: {
      financialStatus: payload.financial_status ?? undefined,
      fulfillmentStatus: payload.fulfillment_status ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

export const config = { api: { bodyParser: false } };
