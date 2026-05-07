import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      shopDomain: string;
      userId: string;
      garmentTemplateId: string;
      artUploadId?: string;
      inputs: Record<string, unknown>;
      scalePercent?: number;
      yPercent?: number;
      priceSnapshot?: number;
    };

    const { shopDomain, userId, garmentTemplateId, artUploadId, inputs, scalePercent = 84, yPercent = 42, priceSnapshot } = body;

    const shop = await prisma.shop.findUnique({ where: { shopDomain } });
    if (!shop) return NextResponse.json({ ok: false, error: { code: 'SHOP_NOT_FOUND', message: 'Shop not found.' } }, { status: 404 });

    const configJson = JSON.stringify({ garmentTemplateId, artUploadId, inputs, scalePercent, yPercent });
    const configHash = crypto.createHash('sha256').update(configJson).digest('hex');

    const config = await prisma.productConfiguration.create({
      data: {
        shopId: shop.id,
        userId,
        garmentTemplateId,
        artUploadId: artUploadId ?? null,
        configJson,
        configHash,
        priceSnapshot: priceSnapshot ?? null,
        scalePercent,
        yPercent,
        status: 'draft',
      },
    });

    return NextResponse.json({ ok: true, data: { configurationId: config.id } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Internal error.' } }, { status: 500 });
  }
}
