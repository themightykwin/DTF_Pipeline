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

const createSchema = z.object({
  shopId: z.string().cuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  productType: z.enum(['tshirt', 'hoodie', 'crewneck']),
  availableSizes: z.array(z.string()),
  availableColors: z.array(z.object({ label: z.string(), hex: z.string() })),
  basePriceCents: z.number().int().min(0).default(0),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

export async function POST(req: NextRequest) {
  if (!(await adminGuard())) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const data = createSchema.parse(body);

  const product = await prisma.catalogProduct.create({
    data: {
      ...data,
      availableSizes: JSON.stringify(data.availableSizes),
      availableColors: JSON.stringify(data.availableColors),
    },
  });

  return NextResponse.json({ ok: true, product }, { status: 201 });
}
