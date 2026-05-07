import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookHmac } from '@/lib/hmac';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const hmac = req.headers.get('x-shopify-hmac-sha256') ?? '';
  const shopDomain = req.headers.get('x-shopify-shop-domain') ?? '';

  if (!verifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await prisma.shop.updateMany({
    where: { shopDomain },
    data: { isActive: false, uninstalledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export const config = { api: { bodyParser: false } };
