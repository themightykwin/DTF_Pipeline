import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        // Allow the login page through unconditionally
        if (req.nextUrl.pathname === '/admin/login') return true;
        return !!token;
      },
    },
    pages: {
      signIn: '/admin/login',
    },
  },
);

// Only run middleware on /admin routes
export const config = {
  matcher: ['/admin/:path*'],
};
