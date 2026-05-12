import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/customer-auth';

export async function POST() {
  const { name, value, options } = clearSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, value, options);
  return res;
}
