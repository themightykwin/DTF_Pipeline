import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { jwtVerify } from 'jose';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Admin routes ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    return NextResponse.next();
  }

  // ── Customer account routes ────────────────────────────────────────────────
  if (pathname.startsWith('/account')) {
    // Public pages — allow through
    if (
      pathname === '/account/login' ||
      pathname === '/account/register' ||
      pathname === '/account/callback'
    ) {
      return NextResponse.next();
    }

    // Protected pages — require customer session cookie
    const sessionToken = req.cookies.get('customer_session')?.value;
    if (!sessionToken) {
      const loginUrl = new URL('/account/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    let payload: { userId?: string } | null = null;
    try {
      const secret = new TextEncoder().encode(
        process.env.CUSTOMER_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'change-me-in-prod'
      );
      const { payload: p } = await jwtVerify(sessionToken, secret);
      payload = p as { userId?: string };
    } catch {}
    if (!payload?.userId) {
      const loginUrl = new URL('/account/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*'],
};
