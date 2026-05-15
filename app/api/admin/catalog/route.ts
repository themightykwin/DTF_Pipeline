import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

async function adminGuard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;
  return true;
}

export async function GET(req: NextRequest) {
  if (!(await adminGuard())) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const shopId = req.nextUrl.searchParams.get('shopId');
  const status = req.nextUrl.searchParams.get('status');

  const products = await prisma.catalogProduct.findMany({
    where: {
      ...(shopId ? { shopId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { configurations: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ ok: true, products });
}

const colorSchema = z.object({
  label: z.string(),
  hex: z.string(),
  sku: z.string().optional(),   // per-color SKU override
});

const createSchema = z.object({
  shopId: z.string().cuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  productType: z.enum(['tshirt', 'hoodie', 'crewneck']),
  availableSizes: z.array(z.string()),
  availableColors: z.array(colorSchema),
  basePriceCents: z.number().int().min(0).default(0),
  costCents: z.number().int().min(0).default(0),
  skuPrefix: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

export async function POST(req: NextRequest) {
  if (!(await adminGuard())) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const data = createSchema.parse(body);

  const { availableSizes, availableColors, ...rest } = data;
  const product = await prisma.catalogProduct.create({
    data: {
      ...rest,
      availableSizes: JSON.stringify(availableSizes),
      availableColors: JSON.stringify(availableColors),
    },
  });

  return NextResponse.json({ ok: true, product }, { status: 201 });
}
