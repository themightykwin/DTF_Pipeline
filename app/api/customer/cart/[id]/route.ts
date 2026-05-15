import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';

// DELETE /api/customer/cart/[id] — remove a cart item
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });

  const item = await prisma.cartItem.findFirst({
    where: { id: params.id, userId: session.userId },
  });
  if (!item) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });

  await prisma.cartItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
