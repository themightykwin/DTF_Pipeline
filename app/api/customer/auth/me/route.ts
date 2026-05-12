import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customer-auth';

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ ok: false, user: null }, { status: 401 });
  return NextResponse.json({ ok: true, user: session.user });
}
