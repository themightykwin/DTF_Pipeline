import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const DEMO_SHOP_DOMAIN = 'demo.dtfpipeline.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      shopDomain?: string;
      userId: string;
      garmentTemplateId: string;
      artUploadId?: string;
      catalogProductId?: string;
      inputs: Record<string, unknown>;
      scalePercent?: number;
      yPercent?: number;
      priceSnapshot?: number;
    };

    const {
      shopDomain = DEMO_SHOP_DOMAIN,
      userId,
      garmentTemplateId,
      artUploadId,
      catalogProductId,
      inputs,
      scalePercent = 84,
      yPercent = 42,
      priceSnapshot,
    } = body;

    // Upsert shop — for the demo flow this creates a placeholder shop row
    // so saves work without a real Shopify installation.
    const shop = await prisma.shop.upsert({
      where: { shopDomain: shopDomain === 'your-store.myshopify.com' ? DEMO_SHOP_DOMAIN : shopDomain },
      update: {},
      create: {
        shopDomain: shopDomain === 'your-store.myshopify.com' ? DEMO_SHOP_DOMAIN : shopDomain,
        accessTokenEncrypted: 'demo',
        scopes: 'demo',
        isActive: true,
      },
    });

    // Upsert demo user (same guard as /api/upload)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@demo.dtfpipeline.com`,
        name: 'Demo User',
      },
    });

    const configJson = JSON.stringify({ garmentTemplateId, artUploadId, inputs, scalePercent, yPercent });
    const configHash = crypto.createHash('sha256').update(configJson).digest('hex');

    const config = await prisma.productConfiguration.create({
      data: {
        shopId: shop.id,
        userId,
        garmentTemplateId,
        artUploadId: artUploadId ?? null,
        catalogProductId: catalogProductId ?? null,
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
    console.error('[/api/configs POST]', e);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: 'Internal error.' } },
      { status: 500 }
    );
  }
}
