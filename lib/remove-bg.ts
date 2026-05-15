/**
 * remove.bg API wrapper
 *
 * Sends an image buffer to remove.bg and returns a transparent PNG buffer.
 * Requires REMOVE_BG_API_KEY env var. If the key is not set, throws an error.
 *
 * API docs: https://www.remove.bg/api
 * Free tier: 50 calls/month.
 */

export interface RemoveBgResult {
  buffer: Buffer;
  creditsCharged: number;
}

export async function removeBackground(inputBuffer: Buffer): Promise<RemoveBgResult> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    throw new Error('REMOVE_BG_API_KEY is not configured.');
  }

  const formData = new FormData();
  formData.append('image_file', new Blob([new Uint8Array(inputBuffer)]), 'image.png');
  formData.append('size', 'auto');

  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown error');
    throw new Error(`remove.bg API error ${res.status}: ${errText}`);
  }

  const creditsCharged = parseFloat(res.headers.get('X-Credits-Charged') ?? '1');
  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    creditsCharged,
  };
}
