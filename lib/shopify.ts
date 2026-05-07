import { createAdminApiClient } from '@shopify/admin-api-client';

/**
 * Build a Shopify Admin GraphQL client for a given store.
 */
export function getShopifyClient(shopDomain: string, accessToken: string) {
  return createAdminApiClient({
    storeDomain: shopDomain,
    apiVersion: '2026-01',
    accessToken,
  });
}

/**
 * Build the Shopify OAuth authorize URL.
 */
export function buildAuthUrl(shop: string, state: string): string {
  const scopes = process.env.SHOPIFY_SCOPES ?? '';
  const redirectUri = `${process.env.APP_URL}/api/auth/callback`;
  const apiKey = process.env.SHOPIFY_API_KEY ?? '';
  return `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&grant_options[]=per-user`;
}

/**
 * Exchange OAuth code for a permanent access token.
 */
export async function exchangeToken(
  shop: string,
  code: string
): Promise<string> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

/**
 * Register a webhook subscription via GraphQL.
 */
export async function registerWebhook(
  shopDomain: string,
  accessToken: string,
  topic: string,
  callbackUrl: string
) {
  const client = getShopifyClient(shopDomain, accessToken);
  const mutation = `#graphql
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription { id }
        userErrors { field message }
      }
    }`;
  await client.request(mutation, {
    variables: {
      topic,
      webhookSubscription: {
        callbackUrl,
        format: 'JSON',
      },
    },
  });
}
