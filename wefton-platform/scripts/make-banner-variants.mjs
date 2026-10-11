// One-off: build WebP size variants of the homepage banners.
//
//   node scripts/make-banner-variants.mjs
//
// For each source in public/banners/ listed below, writes
// <name>-480.webp, <name>-960.webp and <name>-1600.webp next to it.
// src/lib/bannerLoader.ts picks the right one for each screen width.
// Re-run after replacing a banner, and commit the output.
import path from 'node:path';
import sharp from 'sharp';

const DIR = path.join(import.meta.dirname, '..', 'public', 'banners');
const SOURCES = ['hero-men-collection.jpg', 'hero-women-collection2.png', 'hero-new-arrivals.jpg'];
const WIDTHS = [480, 960, 1600];

for (const file of SOURCES) {
  const base = file.replace(/\.[^.]+$/, '');
  for (const width of WIDTHS) {
    const out = path.join(DIR, `${base}-${width}.webp`);
    const info = await sharp(path.join(DIR, file))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(out);
    console.log(`${path.basename(out)}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
  }
}
