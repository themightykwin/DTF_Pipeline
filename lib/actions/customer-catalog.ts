'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// ─── Session helper ──────────────────────────────────────────────────────────
// Customer sessions use a signed JWT stored in a cookie set by the
// /account/callback route. Read the userId + shopId from that token.

import { jwtVerify } from 'jose';

async function requireCustomerSession() {
  const cookieStore = cookies();
  const token = cookieStore.get('customer_session')?.value;
  if (!token) throw new Error('UNAUTHENTICATED');

  const secret = new TextEncoder().encode(process.env.CUSTOMER_SESSION_SECRET ?? 'change-me');
  const { payload } = await jwtVerify(token, secret);

  const userId = payload.userId as string;
  const shopId = payload.shopId as string;
  if (!userId || !shopId) throw new Error('INVALID_SESSION');

  return { userId, shopId };
}

// ─── Schemas ────────────────────────────────────────────────────────────────

const saveConfigSchema = z.object({
  configurationId: z.string().cuid(),
  customerLabel: z.string().min(1).max(100).optional(),
  thumbnailUrl: z.string().url().optional(),
});

// ─── Actions ────────────────────────────────────────────────────────────────

/** Save a configuration to the customer's private catalog. */
export async function saveConfigToMyCatalog(raw: unknown) {
  const { userId, shopId } = await requireCustomerSession();
  const data = saveConfigSchema.parse(raw);

  // Verify the configuration belongs to this user + shop
  const config = await prisma.productConfiguration.findFirst({
    where: { id: data.configurationId, userId, shopId },
  });
  if (!config) throw new Error('NOT_FOUND');

  const updated = await prisma.productConfiguration.update({
    where: { id: data.configurationId },
    data: {
      isSaved: true,
      customerLabel: data.customerLabel ?? config.customerLabel,
      thumbnailUrl: data.thumbnailUrl ?? config.thumbnailUrl,
    },
  });

  revalidatePath('/account/products');
  return { ok: true, configuration: updated };
}

/** Remove a configuration from the customer's saved catalog (unsave, not delete). */
export async function unsaveConfigFromMyCatalog(configurationId: string) {
  const { userId, shopId } = await requireCustomerSession();

  const config = await prisma.productConfiguration.findFirst({
    where: { id: configurationId, userId, shopId },
  });
  if (!config) throw new Error('NOT_FOUND');

  await prisma.productConfiguration.update({
    where: { id: configurationId },
    data: { isSaved: false },
  });

  revalidatePath('/account/products');
  return { ok: true };
}

/** Rename a saved configuration. */
export async function renameConfig(configurationId: string, label: string) {
  const { userId, shopId } = await requireCustomerSession();

  const config = await prisma.productConfiguration.findFirst({
    where: { id: configurationId, userId, shopId, isSaved: true },
  });
  if (!config) throw new Error('NOT_FOUND');

  await prisma.productConfiguration.update({
    where: { id: configurationId },
    data: { customerLabel: label.trim().slice(0, 100) },
  });

  revalidatePath('/account/products');
  return { ok: true };
}

/** Fetch all saved configurations for the current customer (server component use). */
export async function getMySavedProducts() {
  const { userId, shopId } = await requireCustomerSession();

  const configs = await prisma.productConfiguration.findMany({
    where: { userId, shopId, isSaved: true },
    include: {
      garmentTemplate: { select: { label: true, garmentType: true } },
      artUpload: { select: { storageUrl: true, validationStatus: true } },
      catalogProduct: {
        select: {
          title: true,
          images: { where: { isFeatured: true }, take: 1, select: { storageUrl: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return configs;
}
