import { NextRequest, NextResponse } from 'next/server';
import { exchangeToken, registerWebhook } from '@/lib/shopify';
import { verifyOAuthHmac } from '@/lib/hmac';
import { prisma } from '@/lib/prisma';

const WEBHOOK_TOPICS = [
  { topic: 'ORDERS_CREATE', path: '/api/webhooks/orders-create' },
  { topic: 'ORDERS_UPDATED', path: '/api/webhooks/orders-updated' },
  { topic: 'APP_UNINSTALLED', path: '/api/webhooks/app-uninstalled' },
];

export async function GET(req: NextRequest) {
  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => { params[key] = value; });

  const { shop, code, state, hmac } = params;
  const storedState = req.cookies.get('shopify_oauth_state')?.value;

  if (!shop || !code || !state || !hmac) {
    return NextResponse.json({ ok: false, error: { code: 'MISSING_PARAMS', message: 'Missing OAuth params.' } }, { status: 400 });
  }

  if (state !== storedState) {
    return NextResponse.json({ ok: false, error: { code: 'STATE_MISMATCH', message: 'State mismatch.' } }, { status: 403 });
  }

  if (!verifyOAuthHmac(params, hmac)) {
    return NextResponse.json({ ok: false, error: { code: 'HMAC_INVALID', message: 'HMAC verification failed.' } }, { status: 403 });
  }

  const accessToken = await exchangeToken(shop, code);

  await prisma.shop.upsert({
    where: { shopDomain: shop },
    create: {
      shopDomain: shop,
      accessTokenEncrypted: accessToken, // TODO: encrypt before storing
      scopes: process.env.SHOPIFY_SCOPES ?? '',
      isActive: true,
      settings: { create: {} },
    },
    update: {
      accessTokenEncrypted: accessToken,
      isActive: true,
      uninstalledAt: null,
    },
  });

  const appUrl = process.env.APP_URL ?? '';
  for (const wh of WEBHOOK_TOPICS) {
    try {
      await registerWebhook(shop, accessToken, wh.topic, `${appUrl}${wh.path}`);
    } catch (e) {
      console.error(`Webhook registration failed for ${wh.topic}:`, e);
    }
  }

  const response = NextResponse.redirect(`${appUrl}/?shop=${shop}`);
  response.cookies.delete('shopify_oauth_state');
  return response;
}
