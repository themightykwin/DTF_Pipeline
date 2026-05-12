'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';

// ─── Schemas ────────────────────────────────────────────────────────────────

const catalogProductSchema = z.object({
  shopId: z.string().cuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  productType: z.enum(['tshirt', 'hoodie', 'crewneck']),
  availableSizes: z.array(z.string()).min(1),
  availableColors: z.array(
    z.object({ label: z.string(), hex: z.string() })
  ),
  basePriceCents: z.number().int().min(0),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  sortOrder: z.number().int().default(0),
});

// ─── Actions ────────────────────────────────────────────────────────────────

export async function createCatalogProduct(raw: unknown) {
  await requireAdminSession();
  const { availableSizes, availableColors, ...rest } = catalogProductSchema.parse(raw);

  const product = await prisma.catalogProduct.create({
    data: {
      ...rest,
      availableSizes: JSON.stringify(availableSizes),
      availableColors: JSON.stringify(availableColors),
    },
  });

  revalidatePath('/admin/products');
  return { ok: true, product };
}

export async function updateCatalogProduct(id: string, raw: unknown) {
  await requireAdminSession();
  const { availableSizes, availableColors, ...rest } = catalogProductSchema.partial().parse(raw);

  await prisma.catalogProduct.findUniqueOrThrow({ where: { id } });

  const product = await prisma.catalogProduct.update({
    where: { id },
    data: {
      ...rest,
      ...(availableSizes !== undefined && { availableSizes: JSON.stringify(availableSizes) }),
      ...(availableColors !== undefined && { availableColors: JSON.stringify(availableColors) }),
    },
  });

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${id}`);
  return { ok: true, product };
}

export async function deleteCatalogProduct(id: string) {
  await requireAdminSession();
  await prisma.catalogProduct.findUniqueOrThrow({ where: { id } });
  await prisma.catalogProduct.delete({ where: { id } });
  revalidatePath('/admin/products');
  return { ok: true };
}

export async function addCatalogProductImage(
  catalogProductId: string,
  data: { storageUrl: string; cloudinaryId?: string; altText?: string; isFeatured?: boolean; sortOrder?: number }
) {
  await requireAdminSession();
  await prisma.catalogProduct.findUniqueOrThrow({ where: { id: catalogProductId } });

  if (data.isFeatured) {
    await prisma.catalogProductImage.updateMany({
      where: { catalogProductId },
      data: { isFeatured: false },
    });
  }

  const image = await prisma.catalogProductImage.create({
    data: { catalogProductId, ...data },
  });

  revalidatePath(`/admin/products/${catalogProductId}`);
  return { ok: true, image };
}

export async function deleteCatalogProductImage(imageId: string) {
  await requireAdminSession();
  await prisma.catalogProductImage.delete({ where: { id: imageId } });
  return { ok: true };
}

export async function reorderCatalogProductImages(
  catalogProductId: string,
  orderedIds: string[]
) {
  await requireAdminSession();

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.catalogProductImage.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  revalidatePath(`/admin/products/${catalogProductId}`);
  return { ok: true };
}
