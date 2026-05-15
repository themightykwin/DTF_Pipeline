/**
 * Customer (storefront) authentication helpers.
 * Uses email + password with bcrypt, sessions stored as signed JWTs in httpOnly cookies.
 * Completely independent of the Shopify OIDC flow.
 */
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = 'customer_session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

function getSecret() {
  const s = process.env.CUSTOMER_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'change-me-in-prod';
  return new TextEncoder().encode(s);
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export async function signCustomerToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyCustomerToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

// ── Session from cookie ───────────────────────────────────────────────────────

export async function getCustomerSession(): Promise<{ userId: string; user: { id: string; email: string; name: string | null } } | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyCustomerToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, status: true },
  });
  if (!user || user.status !== 'active') return null;

  return { userId: user.id, user: { id: user.id, email: user.email, name: user.name } };
}

/** Throws 'UNAUTHENTICATED' if no valid session — use in server actions / pages. */
export async function requireCustomerSession() {
  const session = await getCustomerSession();
  if (!session) throw new Error('UNAUTHENTICATED');
  return session;
}

// ── Register ─────────────────────────────────────────────────────────────────

export async function registerCustomer(email: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.passwordHash) throw new Error('EMAIL_TAKEN');
    // User exists (e.g. demo upload user) — set password on it
    const passwordHash = await bcrypt.hash(password, 12);
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, name: name ?? existing.name },
    });
    return updated;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { email, name: name ?? null, passwordHash },
  });
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginCustomer(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');
  if (user.status !== 'active') throw new Error('ACCOUNT_DISABLED');

  return user;
}

// ── Cookie helpers (used in API routes) ──────────────────────────────────────

export function buildSessionCookieValue(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: SESSION_DURATION,
      path: '/',
    },
  };
}

export function clearSessionCookie() {
  return { name: SESSION_COOKIE, value: '', options: { maxAge: 0, path: '/' } };
}
