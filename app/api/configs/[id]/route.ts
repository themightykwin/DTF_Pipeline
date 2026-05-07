import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const config = await prisma.productConfiguration.findUnique({
    where: { id: params.id },
    include: { garmentTemplate: true, artUpload: true, shopifyProduct: true },
  });
  if (!config) return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Configuration not found.' } }, { status: 404 });
  return NextResponse.json({ ok: true, data: config });
}
