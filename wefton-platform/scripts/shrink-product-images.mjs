// One-off: shrink product photos already in Firebase Storage.
//
//   node scripts/shrink-product-images.mjs            # report only, changes nothing
//   node scripts/shrink-product-images.mjs --apply    # write the smaller copies
//
// Needs a service account: set GOOGLE_APPLICATION_CREDENTIALS to its key file
// (never commit it), or run where Application Default Credentials work
// (`gcloud auth application-default login`).
//
// Photos uploaded before uploads were shrunk in the browser are often 2–10 MB.
// For each product image in Firestore that is larger than MAX_EDGE px or
// SMALL_BYTES, this writes a WebP copy (at most MAX_EDGE px on the long side)
// next to the original as <name>-1600.webp, and points the product's image url
// at it. The original file is kept, so carts, past orders and anything else
// holding the old link keep working, and a product can be pointed back at it.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'weflive-58678';
const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'weflive-58678.firebasestorage.app';
const MAX_EDGE = 1600;
const SMALL_BYTES = 400 * 1024;
const QUALITY = 82;
const APPLY = process.argv.includes('--apply');

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID, storageBucket: BUCKET });
const db = getFirestore();
const bucket = getStorage().bucket();

/** Storage object path for a Firebase download URL in our bucket, else null. */
function objectPath(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== 'firebasestorage.googleapis.com') return null;
    const m = u.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!m || m[1] !== BUCKET) return null;
    return decodeURIComponent(m[2]);
  } catch {
    return null;
  }
}

const downloadUrl = (path, token) =>
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;

let seen = 0;
let shrunk = 0;
let savedBytes = 0;

const products = await db.collection('products').get();
for (const doc of products.docs) {
  const images = doc.get('images') ?? [];
  let changed = false;
  const next = [];
  for (const img of images) {
    seen += 1;
    const path = objectPath(img.url);
    if (!path || /-1600\.webp$/.test(path)) {
      next.push(img);
      continue;
    }
    try {
      const [buf] = await bucket.file(path).download();
      const meta = await sharp(buf).metadata();
      const tooBig = Math.max(meta.width ?? 0, meta.height ?? 0) > MAX_EDGE || buf.length > SMALL_BYTES;
      if (!tooBig) {
        next.push(img);
        continue;
      }
      const out = await sharp(buf)
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();
      if (out.length >= buf.length) {
        next.push(img);
        continue;
      }
      const newPath = `${path.replace(/\.[^./]+$/, '')}-1600.webp`;
      console.log(
        `${doc.id}  ${path}  ${(buf.length / 1024).toFixed(0)} KB -> ${(out.length / 1024).toFixed(0)} KB`
      );
      shrunk += 1;
      savedBytes += buf.length - out.length;
      if (APPLY) {
        const token = randomUUID();
        await bucket.file(newPath).save(out, {
          contentType: 'image/webp',
          metadata: {
            cacheControl: 'public, max-age=31536000, immutable',
            metadata: { firebaseStorageDownloadTokens: token },
          },
        });
        next.push({ ...img, url: downloadUrl(newPath, token) });
        changed = true;
      } else {
        next.push(img);
      }
    } catch (e) {
      console.warn(`${doc.id}  ${path}  skipped: ${e instanceof Error ? e.message : e}`);
      next.push(img);
    }
  }
  if (APPLY && changed) await doc.ref.update({ images: next });
}

console.log(
  `\n${seen} images checked, ${shrunk} ${APPLY ? 'shrunk' : 'would be shrunk'}, ` +
    `${(savedBytes / 1024 / 1024).toFixed(1)} MB smaller in total.` +
    (APPLY ? '' : '\nNothing was changed. Run again with --apply to write the smaller copies.')
);
