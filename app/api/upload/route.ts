import { NextRequest, NextResponse } from 'next/server';
import { uploadArtwork, UPSCALE_MAX_MEGAPIXELS, UPSCALE_FACTOR } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';
import { validateArtwork, DEFAULT_PRINT_RULES } from '@/lib/validation';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const garmentType = (formData.get('garmentType') as string | null) ?? 'tshirt';

    if (!file || !userId) {
      return NextResponse.json({ ok: false, error: { code: 'MISSING_PARAMS', message: 'file and userId are required.' } }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/tiff'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ ok: false, error: { code: 'UNSUPPORTED_TYPE', message: 'Only PNG, JPEG, WebP, and TIFF are supported.' } }, { status: 415 });
    }

    const MAX_MB = 50;
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: { code: 'FILE_TOO_LARGE', message: `Max file size is ${MAX_MB}MB.` } }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(buffer).metadata();
    const widthPx = meta.width ?? 0;
    const heightPx = meta.height ?? 0;
    const hasTransparency = meta.hasAlpha ?? false;

    const rule = DEFAULT_PRINT_RULES[garmentType] ?? DEFAULT_PRINT_RULES.tshirt;
    const validation = validateArtwork({ widthPx, heightPx, mimeType: file.type }, rule);

    const { url, publicId } = await uploadArtwork(buffer, file.name, userId);

    // Upsert a placeholder user so the FK constraint is satisfied for demo/anonymous uploads
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@demo.dtfpipeline.com`, name: 'Demo User' },
    });

    const artUpload = await prisma.artUpload.create({
      data: {
        userId,
        originalFilename: file.name,
        mimeType: file.type,
        widthPx,
        heightPx,
        hasTransparency,
        storageUrl: url,
        cloudinaryId: publicId,
        validationStatus: validation.status,
        validationJson: JSON.stringify(validation),
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        artUploadId: artUpload.id,
        storageUrl: url,
        validation,
        // Flag if the image lacks transparency — caller can offer BG removal
        needsBgRemoval: !hasTransparency && !!process.env.REMOVE_BG_API_KEY,
        // canUpscale: true when image is warn/fail, under 4.2MP, and ×4 would help
        canUpscale: (() => {
          if (validation.status === 'pass') return false;
          const megapixels = (widthPx * heightPx) / 1_000_000;
          if (megapixels >= UPSCALE_MAX_MEGAPIXELS) return false;
          // Would the upscaled dimensions pass or at least reach warn?
          const upscaledValidation = validateArtwork(
            { widthPx: widthPx * UPSCALE_FACTOR, heightPx: heightPx * UPSCALE_FACTOR, mimeType: file.type },
            rule
          );
          return upscaledValidation.status !== 'fail';
        })(),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: { code: 'SERVER_ERROR', message: 'Internal error.' } }, { status: 500 });
  }
}
