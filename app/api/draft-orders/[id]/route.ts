import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const draft = await prisma.draftOrder.findUnique({
    where: { id: params.id },
    include: { configuration: { include: { garmentTemplate: true } }, order: true },
  });
  if (!draft) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Draft order not found.' } }, { status: 404 });
  return NextResponse.json({ ok: true, data: draft });
}
