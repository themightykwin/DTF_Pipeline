import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const DEMO_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN ?? 'demo.dtfpipeline.com';

// Default print dimensions per garment type (inches)
const GARMENT_DEFAULTS: Record<string, { label: string; maxPrintWidthIn: number; maxPrintHeightIn: number }> = {
  tshirt:   { label: 'T-Shirt',    maxPrintWidthIn: 12, maxPrintHeightIn: 14 },
  hoodie:   { label: 'Hoodie',     maxPrintWidthIn: 12, maxPrintHeightIn: 14 },
  crewneck: { label: 'Crewneck',   maxPrintWidthIn: 12, maxPrintHeightIn: 14 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      shopDomain?: string;
      userId: string;
      garmentTemplateId: string; // We receive productType here (e.g. "tshirt")
      artUploadId?: string;
      catalogProductId?: string;
      inputs: Record<string, unknown>;
      scalePercent?: number;
      yPercent?: number;
      priceSnapshot?: number;
    };

    const {
      shopDomain,
      userId,
      garmentTemplateId: garmentType, // treat as garmentType string, not a DB id
      artUploadId,
      catalogProductId,
      inputs,
      scalePercent = 84,
      yPercent = 42,
      priceSnapshot,
    } = body;

    const resolvedShopDomain =
      !shopDomain || shopDomain === 'your-store.myshopify.com'
        ? DEMO_SHOP_DOMAIN
        : shopDomain;

    // 1. Upsert demo shop
    const shop = await prisma.shop.upsert({
      where:  { shopDomain: resolvedShopDomain },
      update: {},
      create: {
        shopDomain: resolvedShopDomain,
        accessTokenEncrypted: 'demo',
        scopes: 'demo',
        isActive: true,
      },
    });

    // 2. Upsert demo user
    await prisma.user.upsert({
      where:  { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@dtfpipeline.com`,
        name: 'Demo User',
      },
    });

    // 3. Upsert GarmentTemplate by garmentType — required FK on ProductConfiguration
    const defaults = GARMENT_DEFAULTS[garmentType] ?? GARMENT_DEFAULTS.tshirt;
    const garmentTemplate = await prisma.garmentTemplate.upsert({
      where:  { garmentType },
      update: {},
      create: {
        garmentType,
        label:            defaults.label,
        maxPrintWidthIn:  defaults.maxPrintWidthIn,
        maxPrintHeightIn: defaults.maxPrintHeightIn,
        minDpi:           300,
        isActive:         true,
        availableSizes:   JSON.stringify(['S', 'M', 'L', 'XL', '2XL']),
      },
    });

    // 4. Create the configuration
    const configJson = JSON.stringify({ garmentType, artUploadId, inputs, scalePercent, yPercent });
    const configHash  = crypto.createHash('sha256').update(configJson).digest('hex');

    const config = await prisma.productConfiguration.create({
      data: {
        shopId:           shop.id,
        userId,
        garmentTemplateId: garmentTemplate.id,
        artUploadId:      artUploadId ?? null,
        catalogProductId: catalogProductId ?? null,
        configJson,
        configHash,
        priceSnapshot:    priceSnapshot ?? null,
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
