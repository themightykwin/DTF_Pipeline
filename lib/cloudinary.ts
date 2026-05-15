import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

// ─── Upscale limit ──────────────────────────────────────────────────────────
// Cloudinary e_upscale requires input < 4.2 megapixels (≈ 2048×2048)
export const UPSCALE_MAX_MEGAPIXELS = 4.2;
// e_upscale multiplies each dimension by 4 (total 16× pixels)
export const UPSCALE_FACTOR = 4;

/**
 * Upload a file buffer to Cloudinary and return the result.
 */
export async function uploadArtwork(
  buffer: Buffer,
  filename: string,
  userId: string
) {
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `dtf-pipeline/${userId}`,
        public_id: filename.replace(/\.[^.]+$/, ''),
        resource_type: 'image',
        overwrite: false,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Apply Cloudinary AI upscale (e_upscale) to an already-uploaded image.
 *
 * Uses `explicit` with an eager transformation to generate the upscaled
 * derived asset. Polls until Cloudinary finishes (it returns 423 while
 * processing). Returns the upscaled secure_url and output dimensions.
 *
 * Constraint: input must be < 4.2 megapixels (≈ 2048×2048).
 * Output: each dimension ×4 (e.g. 1200×1600 → 4800×6400).
 */
export async function upscaleArtwork(
  publicId: string
): Promise<{ url: string; widthPx: number; heightPx: number }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.explicit(publicId, {
      type: 'upload',
      eager: [{ effect: 'upscale' }],
      eager_async: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, (error: any, result: any) => {
      if (error) return reject(new Error(`Cloudinary upscale failed: ${error.message ?? error}`));
      if (!result) return reject(new Error('Cloudinary upscale returned no result'));

      const eager = result.eager?.[0];
      if (!eager?.secure_url) {
        return reject(new Error('Cloudinary upscale: no eager URL in response'));
      }

      resolve({
        url: eager.secure_url as string,
        widthPx: (eager.width ?? result.width * UPSCALE_FACTOR) as number,
        heightPx: (eager.height ?? result.height * UPSCALE_FACTOR) as number,
      });
    });
  });
}
