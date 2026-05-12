import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginCustomer, signCustomerToken, buildSessionCookieValue } from '@/lib/customer-auth';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const user  = await loginCustomer(body.email, body.password);
    const token = await signCustomerToken(user.id);
    const { name, value, options } = buildSessionCookieValue(token);

    const res = NextResponse.json({ ok: true, data: { userId: user.id, email: user.email, name: user.name } });
    res.cookies.set(name, value, options);
    return res;
  } catch (e: any) {
    if (e?.message === 'INVALID_CREDENTIALS') {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' } }, { status: 401 });
    }
    if (e?.message === 'ACCOUNT_DISABLED') {
      return NextResponse.json({ ok: false, error: { code: 'ACCOUNT_DISABLED', message: 'Your account has been disabled.' } }, { status: 403 });
    }
    console.error('[login]', e);
    return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}
