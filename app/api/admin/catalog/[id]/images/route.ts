import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function adminGuard() {
  const session = await getServerSession(authOptions);
  return !!session?.user;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await adminGuard()))
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const altText = (formData.get('altText') as string) || undefined;
  const isFeatured = formData.get('isFeatured') === 'true';

  if (!file) return NextResponse.json({ ok: false, error: 'No file' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const upload = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'dtf-pipeline/catalog', resource_type: 'image' },
      (err, result) => {
        if (err || !result) reject(err);
        else resolve(result as any);
      }
    ).end(buffer);
  });

  if (isFeatured) {
    await prisma.catalogProductImage.updateMany({
      where: { catalogProductId: params.id },
      data: { isFeatured: false },
    });
  }

  const image = await prisma.catalogProductImage.create({
    data: {
      catalogProductId: params.id,
      storageUrl: upload.secure_url,
      cloudinaryId: upload.public_id,
      altText,
      isFeatured,
    },
  });

  return NextResponse.json({ ok: true, image }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await adminGuard()))
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  // Accepts { orderedIds: string[] } to reorder images
  const { orderedIds } = z.object({ orderedIds: z.array(z.string()) }).parse(await req.json());

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.catalogProductImage.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  return NextResponse.json({ ok: true });
}
