import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Additional checks can go here (e.g. superadmin-only routes)
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token;
      },
    },
    pages: {
      signIn: '/admin/login',
    },
  },
);

// Only protect /admin routes (login page is excluded below)
export const config = {
  matcher: ['/admin/((?!login).*)'],
};
