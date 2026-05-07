import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCustomerCode,
  decodeIdToken,
  upsertCustomerFromTokens,
} from '@/lib/shopify-customer-auth';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const shopId = searchParams.get('shopId') ?? ''; // passed via state in production

  const cookieStore = cookies();
  const storedState = cookieStore.get('customer_oauth_state')?.value;
  const verifier = cookieStore.get('customer_pkce_verifier')?.value;

  if (!code || !state || !storedState || !verifier) {
    return NextResponse.redirect(new URL('/account/login?error=missing_params', req.url));
  }
  if (state !== storedState) {
    return NextResponse.redirect(new URL('/account/login?error=state_mismatch', req.url));
  }

  const tokens = await exchangeCustomerCode(code, verifier);
  const claims = decodeIdToken(tokens.id_token);

  const user = await upsertCustomerFromTokens(shopId, claims.sub, claims.email, claims.name);

  // Issue a signed session cookie
  const secret = new TextEncoder().encode(process.env.CUSTOMER_SESSION_SECRET ?? 'change-me');
  const sessionToken = await new SignJWT({ userId: user.id, shopId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);

  const response = NextResponse.redirect(new URL('/account/products', req.url));
  response.cookies.set('customer_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  response.cookies.delete('customer_oauth_state');
  response.cookies.delete('customer_pkce_verifier');

  return response;
}
