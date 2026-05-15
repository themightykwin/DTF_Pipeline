/**
 * POST /api/upload/upscale
 *
 * Applies Cloudinary AI upscale (e_upscale) to an already-uploaded artwork,
 * re-validates the output against print rules, and updates the ArtUpload record.
 *
 * Body: { artUploadId: string, garmentType?: string }
 *
 * Returns: { ok: true, data: { storageUrl, validation, widthPx, heightPx } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upscaleArtwork, UPSCALE_MAX_MEGAPIXELS } from '@/lib/cloudinary';
import { validateArtwork, DEFAULT_PRINT_RULES } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const { artUploadId, garmentType = 'tshirt' } = await req.json() as {
      artUploadId?: string;
      garmentType?: string;
    };

    if (!artUploadId) {
      return NextResponse.json(
        { ok: false, error: { code: 'MISSING_PARAMS', message: 'artUploadId is required.' } },
        { status: 400 }
      );
    }

    // Load the existing ArtUpload record
    const artUpload = await prisma.artUpload.findUnique({ where: { id: artUploadId } });
    if (!artUpload) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'ArtUpload not found.' } },
        { status: 404 }
      );
    }

    if (!artUpload.cloudinaryId) {
      return NextResponse.json(
        { ok: false, error: { code: 'NO_CLOUDINARY_ID', message: 'No Cloudinary public ID on record.' } },
        { status: 422 }
      );
    }

    // Guard: input must be under 4.2 megapixels for e_upscale
    const megapixels = (artUpload.widthPx * artUpload.heightPx) / 1_000_000;
    if (megapixels >= UPSCALE_MAX_MEGAPIXELS) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'IMAGE_TOO_LARGE',
            message: `Image is ${megapixels.toFixed(1)} MP — upscale requires under ${UPSCALE_MAX_MEGAPIXELS} MP.`,
          },
        },
        { status: 422 }
      );
    }

    // Apply Cloudinary e_upscale transformation
    console.log('[upscale] triggering e_upscale for publicId:', artUpload.cloudinaryId);
    const { url: newUrl, widthPx: newW, heightPx: newH } = await upscaleArtwork(artUpload.cloudinaryId);
    console.log(`[upscale] done: ${artUpload.widthPx}×${artUpload.heightPx} → ${newW}×${newH}`);

    // Re-validate with new dimensions
    const rule = DEFAULT_PRINT_RULES[garmentType] ?? DEFAULT_PRINT_RULES.tshirt;
    const validation = validateArtwork(
      { widthPx: newW, heightPx: newH, mimeType: artUpload.mimeType },
      rule
    );

    // Update ArtUpload record with upscaled URL + dimensions
    await prisma.artUpload.update({
      where: { id: artUploadId },
      data: {
        storageUrl: newUrl,
        widthPx: newW,
        heightPx: newH,
        validationStatus: validation.status,
        validationJson: JSON.stringify(validation),
      },
    });

    // After upscaling, offer BG removal if the image still lacks transparency
    const needsBgRemoval = !artUpload.hasTransparency;

    return NextResponse.json({
      ok: true,
      data: { storageUrl: newUrl, widthPx: newW, heightPx: newH, validation, needsBgRemoval },
    });

  } catch (e) {
    console.error('[/api/upload/upscale] exception:', e);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: e instanceof Error ? e.message : 'Internal error.' } },
      { status: 500 }
    );
  }
}
