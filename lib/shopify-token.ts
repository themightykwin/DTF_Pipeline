/**
 * Manages Shopify Admin API access tokens obtained via client credentials grant.
 * Tokens expire in ~24h so we refresh automatically when needed.
 */

import { prisma } from '@/lib/prisma';

const CLIENT_ID = process.env.SHOPIFY_API_KEY ?? '';
const CLIENT_SECRET = process.env.SHOPIFY_API_SECRET ?? '';

/**
 * Returns a valid Admin API access token for the given shop domain.
 * Refreshes automatically if the stored token is expired or within 1 hour of expiry.
 */
export async function getValidAdminToken(shopDomain: string): Promise<string> {
  const shop = await prisma.shop.findFirst({
    where: { shopDomain, isActive: true },
  });

  if (!shop) throw new Error(`Shop not found: ${shopDomain}`);

  // Check if token needs refresh (if tokenExpiresAt exists and is within 1h)
  const needsRefresh = (() => {
    if (!(shop as unknown as { tokenExpiresAt?: Date }).tokenExpiresAt) return true; // no expiry tracked → always refresh
    const expiresAt = (shop as unknown as { tokenExpiresAt: Date }).tokenExpiresAt;
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    return expiresAt < oneHourFromNow;
  })();

  if (!needsRefresh && shop.accessTokenEncrypted.startsWith('shpat_')) {
    return shop.accessTokenEncrypted;
  }

  // Refresh via client credentials
  console.log('[shopify-token] refreshing access token for', shopDomain);
  const token = await fetchClientCredentialsToken(shopDomain);

  // Persist updated token
  await prisma.shop.update({
    where: { id: shop.id },
    data: {
      accessTokenEncrypted: token,
      updatedAt: new Date(),
    },
  });

  return token;
}

export async function fetchClientCredentialsToken(shopDomain: string): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be set for token refresh');
  }

  const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = await res.json() as { access_token: string; scope: string; expires_in: number };
  console.log('[shopify-token] new token scopes:', json.scope, '| expires_in:', json.expires_in);
  return json.access_token;
}
