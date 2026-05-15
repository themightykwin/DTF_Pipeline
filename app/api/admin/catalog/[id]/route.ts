import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

async function adminGuard() {
  const session = await getServerSession(authOptions);
  return !!session?.user;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await adminGuard()))
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const product = await prisma.catalogProduct.findUnique({
    where: { id: params.id },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!product) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  return NextResponse.json({ ok: true, product });
}

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  productType: z.enum(['tshirt', 'hoodie', 'crewneck']).optional(),
  availableSizes: z.array(z.string()).optional(),
  availableColors: z.array(z.object({ label: z.string(), hex: z.string(), sku: z.string().optional() })).optional(),
  basePriceCents: z.number().int().min(0).optional(),
  costCents: z.number().int().min(0).optional(),
  skuPrefix: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await adminGuard()))
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { availableSizes, availableColors, ...rest } = patchSchema.parse(body);

  const product = await prisma.catalogProduct.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(availableSizes !== undefined && { availableSizes: JSON.stringify(availableSizes) }),
      ...(availableColors !== undefined && { availableColors: JSON.stringify(availableColors) }),
    },
  });

  return NextResponse.json({ ok: true, product });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await adminGuard()))
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  await prisma.catalogProduct.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
