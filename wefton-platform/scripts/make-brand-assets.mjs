// One-off: build the logo and icon files from the master brand logo.
//
//   node scripts/make-brand-assets.mjs <path-to-Wefton_Copper_Logo.png>
//
// The master is a large transparent PNG of the copper "W" mark. Writes:
//   public/brand/wefton-mark.png     trimmed mark for the header and footer
//                                    (next/image resizes it per screen)
//   public/icons/icon-{32,192,512}.png  square icons, transparent
//   public/icons/apple-touch-icon.png   180px on the dark brand background
//                                       (iOS fills transparency with black)
//   public/favicon.png                  256px square, used by Razorpay checkout
//   src/app/favicon.ico                 16/32/48px, PNG-in-ICO
// Re-run after replacing the logo, and commit the output.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.join(import.meta.dirname, '..');
const DARK_BG = '#1a1a1a';

const source = process.argv[2];
if (!source) {
  console.error('Usage: node scripts/make-brand-assets.mjs <master-logo.png>');
  process.exit(1);
}

// Trim the transparent border so the mark's own edges set its box.
const trimmed = await sharp(source).trim({ threshold: 1 }).png().toBuffer();

/** The mark centred on a square canvas, filling `fill` of its width. */
async function square(size, { fill = 0.86, background = { r: 0, g: 0, b: 0, alpha: 0 } } = {}) {
  const inner = Math.round(size * fill);
  const mark = await sharp(trimmed)
    .resize(inner, inner, { fit: 'inside', kernel: 'lanczos3' })
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png({ compressionLevel: 9, palette: true, quality: 95 })
    .toBuffer();
}

/** Pack PNG images into one .ico file (supported by every current browser). */
function toIco(pngs) {
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

async function write(file, data) {
  const out = path.join(ROOT, file);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, data);
  console.log(`${file}  ${(data.length / 1024).toFixed(1)} KB`);
}

await write(
  'public/brand/wefton-mark.png',
  await sharp(trimmed).resize({ width: 720 }).png({ compressionLevel: 9, palette: true, quality: 95 }).toBuffer()
);

for (const size of [32, 192, 512]) {
  await write(`public/icons/icon-${size}.png`, await square(size));
}
await write(
  'public/icons/apple-touch-icon.png',
  await square(180, { fill: 0.72, background: DARK_BG })
);
await write('public/favicon.png', await square(256));

// Small sizes fill more of the square so the mark stays legible in a tab.
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await square(size, { fill: 0.98 }) }))
);
await write('src/app/favicon.ico', toIco(icoPngs));
