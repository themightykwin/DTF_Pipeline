/**
 * POST /api/upload/remove-bg
 *
 * Removes the background from an already-uploaded artwork using remove.bg,
 * re-uploads the clean transparent PNG to Cloudinary, and updates the
 * ArtUpload record in the DB.
 *
 * Body: { artUploadId: string }
 *
 * Returns: { ok: true, data: { storageUrl: string, cloudinaryId: string } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { removeBackground } from '@/lib/remove-bg';
import { uploadArtwork } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.REMOVE_BG_API_KEY) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_CONFIGURED', message: 'Background removal is not enabled.' } },
        { status: 501 }
      );
    }

    const { artUploadId } = await req.json() as { artUploadId?: string };
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

    // Already has transparency — nothing to do
    if (artUpload.hasTransparency) {
      return NextResponse.json({
        ok: true,
        data: { storageUrl: artUpload.storageUrl, cloudinaryId: artUpload.cloudinaryId ?? '' },
      });
    }

    // Fetch the original image from Cloudinary / storageUrl
    const fetchRes = await fetch(artUpload.storageUrl);
    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch original image: ${fetchRes.status}`);
    }
    const originalBuffer = Buffer.from(await fetchRes.arrayBuffer());

    // Remove background via remove.bg API — returns transparent PNG
    console.log('[remove-bg] calling remove.bg for artUploadId:', artUploadId);
    const { buffer: cleanBuffer, creditsCharged } = await removeBackground(originalBuffer);
    console.log('[remove-bg] done. credits charged:', creditsCharged);

    // Re-upload the clean PNG to Cloudinary (new public_id to avoid cache collision)
    const cleanFilename = `${artUpload.originalFilename.replace(/\.[^.]+$/, '')}_nobg.png`;
    const { url: newUrl, publicId: newPublicId } = await uploadArtwork(
      cleanBuffer,
      cleanFilename,
      artUpload.userId
    );

    // Update the ArtUpload record with the new transparent image
    await prisma.artUpload.update({
      where: { id: artUploadId },
      data: {
        storageUrl: newUrl,
        cloudinaryId: newPublicId,
        mimeType: 'image/png',
        hasTransparency: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: { storageUrl: newUrl, cloudinaryId: newPublicId },
    });

  } catch (e) {
    console.error('[/api/upload/remove-bg] exception:', e);
    return NextResponse.json(
      { ok: false, error: { code: 'SERVER_ERROR', message: e instanceof Error ? e.message : 'Internal error.' } },
      { status: 500 }
    );
  }
}
