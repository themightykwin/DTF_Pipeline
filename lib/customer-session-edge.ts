/**
 * Edge-safe JWT verification for the customer session cookie.
 * Uses only the Web Crypto API — no Node.js APIs, no bcryptjs.
 * Imported by middleware.ts (Edge Runtime).
 */

const SESSION_COOKIE = 'customer_session';

function getSecret(): string {
  return process.env.CUSTOMER_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-secret';
}

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function base64urlDecode(str: string): Uint8Array {
  // pad to multiple of 4
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (padded.length % 4)) % 4;
  const b64 = padded + '='.repeat(pad);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface CustomerTokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Verify a customer session JWT using Web Crypto (Edge-safe).
 * Returns the payload or null if invalid/expired.
 */
export async function verifyCustomerTokenEdge(
  token: string,
): Promise<CustomerTokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const key = await importKey(getSecret());
    const enc = new TextEncoder();
    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const signature = base64urlDecode(sigB64);

    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as CustomerTokenPayload;
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
