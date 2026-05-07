import crypto from 'crypto';

/**
 * Verify a Shopify webhook HMAC signature.
 * Must use the raw request body buffer, not the parsed body.
 */
export function verifyWebhookHmac(rawBody: Buffer, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET ?? '';
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(hmacHeader)
  );
}

/**
 * Verify the HMAC on a Shopify OAuth callback.
 */
export function verifyOAuthHmac(
  params: Record<string, string>,
  hmac: string
): boolean {
  const secret = process.env.SHOPIFY_API_SECRET ?? '';
  const message = Object.keys(params)
    .filter((k) => k !== 'hmac')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const digest = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}
