// ============================================================
// Wefton Copper — Shrink product photos before upload (browser)
// ============================================================
// Phone and studio photos are often 2–10 MB PNGs of 3000px or more. The site
// never shows them larger than about 1600px wide, and every visitor's image
// is cut down from the original on the server, so a huge original makes each
// first view slow (most of all on mobile and when switching colours).
// Uploads are therefore scaled to at most MAX_EDGE px on the long side and
// saved as WebP (JPEG where the browser cannot write WebP).

/** Longest side, in px, an uploaded product photo is scaled down to. */
export const MAX_EDGE = 1600;
/** Encoder quality for the saved photo (0–1). */
export const QUALITY = 0.85;
/** A file already this small and within MAX_EDGE is uploaded as it is. */
const SMALL_BYTES = 400 * 1024;

/** Target size for an image of width x height: within MAX_EDGE, never enlarged. */
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** File name with its extension swapped to match the new type. */
export function renameForType(name: string, type: string): string {
  const ext = type === 'image/webp' ? 'webp' : type === 'image/jpeg' ? 'jpg' : 'png';
  const base = name.replace(/\.[^./]+$/, '') || 'image';
  return `${base}.${ext}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Returns a smaller copy of an image file for upload, or the file itself when
 * it is already small, cannot be decoded here, or the copy would not be smaller.
 */
export async function shrinkImageForUpload(file: File): Promise<File> {
  if (typeof window === 'undefined' || typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const target = fitWithin(bitmap.width, bitmap.height);
    const resized = target.width !== bitmap.width || target.height !== bitmap.height;
    if (!resized && file.size <= SMALL_BYTES) return file;

    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, target.width, target.height);

    // Browsers that cannot write WebP hand back a PNG; use JPEG on a white
    // background there instead.
    let blob = await canvasToBlob(canvas, 'image/webp', QUALITY);
    if (!blob || blob.type !== 'image/webp') {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, target.width, target.height);
      blob = await canvasToBlob(canvas, 'image/jpeg', QUALITY);
    }
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], renameForType(file.name, blob.type), { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
