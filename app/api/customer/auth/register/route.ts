import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerCustomer, signCustomerToken, buildSessionCookieValue } from '@/lib/customer-auth';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name:     z.string().min(1).max(80).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const user  = await registerCustomer(body.email, body.password, body.name);
    const token = await signCustomerToken(user.id);
    const { name, value, options } = buildSessionCookieValue(token);

    const res = NextResponse.json({ ok: true, data: { userId: user.id, email: user.email, name: user.name } });
    res.cookies.set(name, value, options);
    return res;
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ ok: false, error: { code: 'VALIDATION', message: e.errors[0]?.message ?? 'Invalid input' } }, { status: 400 });
    }
    if (e?.message === 'EMAIL_TAKEN') {
      return NextResponse.json({ ok: false, error: { code: 'EMAIL_TAKEN', message: 'An account with that email already exists.' } }, { status: 409 });
    }
    console.error('[register]', e);
    return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}
