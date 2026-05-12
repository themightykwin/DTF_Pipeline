import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';
import crypto from 'crypto';

const DEMO_SHOP_DOMAIN = 'demo.dtfpipeline.com';

const GARMENT_DEFAULTS: Record<string, { label: string; maxPrintWidthIn: number; maxPrintHeightIn: number }> = {
  tshirt:   { label: 'T-Shirt',  maxPrintWidthIn: 12, maxPrintHeightIn: 14 },
  hoodie:   { label: 'Hoodie',   maxPrintWidthIn: 12, maxPrintHeightIn: 14 },
  crewneck: { label: 'Crewneck', maxPrintWidthIn: 12, maxPrintHeightIn: 14 },
};

// When called with configurationId, mark an existing config as saved.
// When called with garmentType + full inputs, create a new saved config.
const markSavedSchema = z.object({
  configurationId: z.string(),
  customerLabel:   z.string().max(100).optional(),
});

const saveSchema = z.object({
  garmentType:     z.string(),
  artUploadId:     z.string().optional(),
  catalogProductId:z.string().optional(),
  customerLabel:   z.string().max(100).optional(),
  quantities:      z.record(z.record(z.number().int().min(0))),
  selectedColors:  z.array(z.string()),
  front:           z.any().optional(),
  back:            z.any().optional(),
  priceSnapshot:   z.number().optional(),
});

// GET — list saved designs for the logged-in customer
export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });

  const designs = await prisma.productConfiguration.findMany({
    where: { userId: session.userId, isSaved: true },
    include: {
      catalogProduct: {
        select: {
          id: true, title: true, productType: true, basePriceCents: true,
          images: { where: { isFeatured: true }, take: 1, select: { storageUrl: true, altText: true } },
        },
      },
      artUpload: { select: { storageUrl: true } },
      garmentTemplate: { select: { label: true, garmentType: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ ok: true, data: designs });
}

// POST — save a design: either mark an existing config as saved (configurationId)
//         or create a new saved config from full inputs
export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });

  try {
    const raw = await req.json() as Record<string, unknown>;

    // Fast path: mark an existing configuration as isSaved=true
    if ('configurationId' in raw) {
      const { configurationId, customerLabel } = markSavedSchema.parse(raw);
      // Ensure this config belongs to the current user
      const existing = await prisma.productConfiguration.findFirst({
        where: { id: configurationId, userId: session.userId },
      });
      if (!existing) {
        return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
      }
      await prisma.productConfiguration.update({
        where: { id: configurationId },
        data: { isSaved: true, ...(customerLabel ? { customerLabel } : {}) },
      });
      return NextResponse.json({ ok: true, data: { configurationId } });
    }

    const body = saveSchema.parse(raw);

    // Upsert demo shop
    const shop = await prisma.shop.upsert({
      where: { shopDomain: DEMO_SHOP_DOMAIN },
      update: {},
      create: { shopDomain: DEMO_SHOP_DOMAIN, accessTokenEncrypted: 'demo', scopes: 'demo', isActive: true },
    });

    // Upsert garment template
    const defaults = GARMENT_DEFAULTS[body.garmentType] ?? GARMENT_DEFAULTS.tshirt;
    const garmentTemplate = await prisma.garmentTemplate.upsert({
      where: { garmentType: body.garmentType },
      update: {},
      create: {
        garmentType: body.garmentType, label: defaults.label,
        maxPrintWidthIn: defaults.maxPrintWidthIn, maxPrintHeightIn: defaults.maxPrintHeightIn,
        minDpi: 300, isActive: true, availableSizes: JSON.stringify(['S', 'M', 'L', 'XL', '2XL']),
      },
    });

    const inputs = { garmentType: body.garmentType, selectedColors: body.selectedColors, quantities: body.quantities, front: body.front, back: body.back };
    const configJson = JSON.stringify(inputs);
    const configHash = crypto.createHash('sha256').update(configJson).digest('hex');

    const config = await prisma.productConfiguration.create({
      data: {
        shopId:           shop.id,
        userId:           session.userId,
        garmentTemplateId: garmentTemplate.id,
        artUploadId:      body.artUploadId ?? null,
        catalogProductId: body.catalogProductId ?? null,
        configJson,
        configHash,
        priceSnapshot:    body.priceSnapshot ?? null,
        scalePercent:     Math.round((body.front?.transform?.scalePct ?? body.back?.transform?.scalePct ?? 80)),
        yPercent:         Math.round(((body.front?.transform?.yPct ?? body.back?.transform?.yPct ?? 0.4) * 100)),
        status:           'draft',
        isSaved:          true,
        customerLabel:    body.customerLabel ?? null,
      },
    });

    return NextResponse.json({ ok: true, data: { configurationId: config.id } });
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ ok: false, error: 'VALIDATION' }, { status: 400 });
    }
    console.error('[designs POST]', e);
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
