// ============================================================
// Wefton Copper — Product Image Service (Firebase Storage)
// ============================================================
// Shared multi-image upload logic used by both ProductFormModal (create/edit)
// and ProductImageManager (per-product image upload after bulk import).

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from '@/lib/firebase';
import { shrinkImageForUpload } from '@/lib/imageResize';
import type { ProductImage } from '@/types';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ImageUploadResult {
  uploaded: ProductImage[];
  failures: { fileName: string; message: string }[];
  /** For each uploaded image, the position of its file in `files`. */
  sourceIndexes: number[];
}

/** Filters a FileList/array to valid image files (type + size). */
export function filterValidImageFiles(files: File[]): File[] {
  return files.filter(
    (f) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(f.type) && f.size <= MAX_IMAGE_BYTES
  );
}

/**
 * Uploads image files to Firebase Storage under the product's path and returns
 * the resulting ProductImage descriptors. Failures are reported per-file so
 * successful uploads are never discarded.
 *
 * @param altBase   Alt-text base (usually the product title).
 * @param markFirstPrimary  When true and there are no existing images, the
 *                          first uploaded image is flagged isPrimary.
 */
export async function uploadProductImages(
  productId: string,
  files: File[],
  altBase: string,
  markFirstPrimary = false,
  onProgress?: (done: number, total: number) => void,
  /** Colour for each file, by position; unset = every colour. */
  colors?: (string | undefined)[]
): Promise<ImageUploadResult> {
  const storage = getFirebaseStorage();
  if (!storage) throw new Error('Firebase Storage is not configured.');

  const uploaded: ProductImage[] = [];
  const failures: ImageUploadResult['failures'] = [];
  const sourceIndexes: number[] = [];
  let done = 0;

  for (const [index, file] of files.entries()) {
    try {
      // Scaled down to the largest size the site shows, so pages load fast.
      const upload = await shrinkImageForUpload(file);
      const filename = `${Date.now()}-${upload.name}`;
      const storageRef = ref(storage, `products/${productId}/${filename}`);
      // Images never change at a given path, so browsers and CDNs may keep them.
      await uploadBytes(storageRef, upload, {
        contentType: upload.type,
        cacheControl: 'public, max-age=31536000, immutable',
      });
      const url = await getDownloadURL(storageRef);
      const color = colors?.[index];
      uploaded.push({
        url,
        alt: altBase || file.name,
        isPrimary: markFirstPrimary && uploaded.length === 0,
        ...(color ? { color } : {}),
      });
      sourceIndexes.push(index);
    } catch (e) {
      failures.push({ fileName: file.name, message: e instanceof Error ? e.message : 'Upload failed' });
    } finally {
      done += 1;
      onProgress?.(done, files.length);
    }
  }

  return { uploaded, failures, sourceIndexes };
}
