/**
 * Shopify Customer Account API (OIDC/PKCE) helpers.
 *
 * Flow:
 *  1. buildAuthUrl()  → redirect buyer to Shopify login
 *  2. handleCallback() → exchange code for tokens, upsert User + ShopCustomer
 *
 * Docs: https://shopify.dev/docs/api/customer
 */
import { SignJWT, importJWK } from 'jose';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const CUSTOMER_AUTH_BASE = process.env.SHOPIFY_CUSTOMER_AUTH_URL ?? ''; // e.g. https://{shop}.myshopify.com
const CLIENT_ID = process.env.SHOPIFY_CUSTOMER_CLIENT_ID ?? '';
const APP_URL = process.env.APP_URL ?? '';
const REDIRECT_URI = `${APP_URL}/account/callback`;

export function generatePkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function buildAuthUrl(shopId: string, state: string, challenge: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid email https://api.customers.com/auth/customer.graphql',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    nonce: crypto.randomBytes(16).toString('hex'),
  });
  return `${CUSTOMER_AUTH_BASE}/oauth/authorize?${params.toString()}`;
}

export async function exchangeCustomerCode(code: string, verifier: string) {
  const res = await fetch(`${CUSTOMER_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json() as Promise<{ access_token: string; id_token: string; refresh_token?: string }>;
}

/** Decode the id_token payload (no verification — Shopify-signed). */
export function decodeIdToken(idToken: string): { email: string; sub: string; name?: string } {
  const [, payload] = idToken.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
}

/** Upsert User + ShopCustomer after a successful token exchange. */
export async function upsertCustomerFromTokens(
  shopId: string,
  shopifyCustomerId: string,
  email: string,
  name?: string,
) {
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name },
    update: { name },
  });

  await prisma.shopCustomer.upsert({
    where: { shopId_userId: { shopId, userId: user.id } },
    create: { shopId, userId: user.id, shopifyCustomerId },
    update: { shopifyCustomerId },
  });

  return user;
}
