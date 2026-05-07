import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/shopify';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get('shop');
  if (!shop || !shop.endsWith('.myshopify.com')) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_SHOP', message: 'Valid shop domain required.' } }, { status: 400 });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const authUrl = buildAuthUrl(shop, state);

  // State should be stored in a short-lived mechanism; using a cookie here for MVP.
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('shopify_oauth_state', state, { httpOnly: true, secure: true, maxAge: 300 });
  return response;
}
