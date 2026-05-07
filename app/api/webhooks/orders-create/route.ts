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

  const payload = JSON.parse(rawBody.toString()) as { id: number; note?: string };
  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop) return NextResponse.json({ ok: true }); // Not our shop, ack and ignore

  // Idempotency check
  const existing = await prisma.webhookEvent.findUnique({ where: { shopId_shopifyEventId: { shopId: shop.id, shopifyEventId: eventId } } });
  if (existing) return NextResponse.json({ ok: true });

  await prisma.webhookEvent.create({
    data: { shopId: shop.id, topic: 'orders/create', shopifyEventId: eventId, payloadJson: rawBody.toString(), status: 'pending' },
  });

  // Match order to a draft order via note tag
  const configMatch = payload.note?.match(/config:([a-z0-9]+)/);
  if (configMatch) {
    const configurationId = configMatch[1];
    const draftOrder = await prisma.draftOrder.findFirst({ where: { configurationId } });
    if (draftOrder) {
      await prisma.order.upsert({
        where: { draftOrderId: draftOrder.id },
        create: {
          shopId: shop.id,
          draftOrderId: draftOrder.id,
          shopifyOrderId: String(payload.id),
          financialStatus: 'pending',
          fulfillmentStatus: 'unfulfilled',
        },
        update: { shopifyOrderId: String(payload.id) },
      });
      await prisma.draftOrder.update({ where: { id: draftOrder.id }, data: { status: 'completed' } });
    }
  }

  await prisma.webhookEvent.updateMany({
    where: { shopId: shop.id, shopifyEventId: eventId },
    data: { status: 'processed', processedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export const config = { api: { bodyParser: false } };
