import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';

const addSchema = z.object({
  configurationId: z.string().cuid(),
  quantities:      z.record(z.record(z.number().int().min(0))),
  selectedColors:  z.array(z.string()),
  notes:           z.string().max(500).optional(),
});

// GET /api/customer/cart — fetch the current user's cart
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });

  const items = await prisma.cartItem.findMany({
    where: { userId: session.userId },
    include: {
      configuration: {
        include: {
          catalogProduct: {
            select: {
              id: true,
              title: true,
              basePriceCents: true,
              productType: true,
              images: { where: { isFeatured: true }, take: 1, select: { storageUrl: true, altText: true } },
            },
          },
          artUpload: { select: { storageUrl: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ ok: true, data: items });
}

// POST /api/customer/cart — add item to cart
export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });

  try {
    const body = addSchema.parse(await req.json());

    // Verify the config belongs to this user
    const config = await prisma.productConfiguration.findFirst({
      where: { id: body.configurationId, userId: session.userId },
    });
    if (!config) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });

    const item = await prisma.cartItem.create({
      data: {
        userId:          session.userId,
        configurationId: body.configurationId,
        quantities:      JSON.stringify(body.quantities),
        selectedColors:  JSON.stringify(body.selectedColors),
        notes:           body.notes ?? null,
      },
    });

    return NextResponse.json({ ok: true, data: { cartItemId: item.id } });
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ ok: false, error: 'VALIDATION' }, { status: 400 });
    }
    console.error('[cart POST]', e);
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
