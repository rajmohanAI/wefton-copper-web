import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import {
  validateSerialConfig,
  buildSerials,
  serialToFilename,
  buildZipName,
  type SerialConfig,
} from '@/lib/serialgen';

// Barcode rendering + filesystem writes require the Node.js runtime.
export const runtime = 'nodejs';
// This is a local admin utility that writes files on demand — never cache.
export const dynamic = 'force-dynamic';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'serial');

/**
 * POST /api/serialgen
 * Body: { prefix, suffix, start, end, increment, barcodeType? }
 * Generates a Code128 barcode PNG per serial, zips them, writes the ZIP to
 * public/serial/, and returns the download URL.
 *
 * Local admin utility only — not intended for the deployed app.
 */
export async function POST(request: NextRequest) {
  let body: Partial<SerialConfig> & { barcodeType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const cfg: SerialConfig = {
    prefix: (body.prefix ?? '').toString(),
    suffix: (body.suffix ?? '').toString(),
    start: Number(body.start),
    end: Number(body.end),
    increment: Number(body.increment),
  };

  const validation = validateSerialConfig(cfg);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // bcid = barcode symbology. Default Code128 (alphanumeric product serials).
  const bcid = body.barcodeType === 'qrcode' ? 'qrcode' : 'code128';

  let toBuffer: typeof import('bwip-js/node').toBuffer;
  try {
    ({ toBuffer } = await import('bwip-js/node'));
  } catch (e) {
    console.error('[serialgen] Failed to load bwip-js:', e);
    return NextResponse.json({ error: 'Barcode engine is not available.' }, { status: 503 });
  }

  const serials = buildSerials(cfg);
  const zip = new JSZip();

  try {
    for (const serial of serials) {
      const png = await toBuffer({
        bcid,
        text: serial,
        scale: 3,
        height: bcid === 'qrcode' ? undefined : 12,
        includetext: true,
        textxalign: 'center',
      });
      zip.file(serialToFilename(serial), png);
    }

    // Include a manifest of every serial in the batch.
    zip.file('serials.txt', serials.join('\n') + '\n');

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const zipName = buildZipName(cfg);
    await fs.writeFile(path.join(OUTPUT_DIR, zipName), zipBuffer);

    return NextResponse.json({
      success: true,
      file: zipName,
      url: `/serial/${zipName}`,
      count: serials.length,
      first: serials[0],
      last: serials[serials.length - 1],
    });
  } catch (e) {
    console.error('[serialgen] Generation failed:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: `Barcode generation failed: ${message}` }, { status: 500 });
  }
}
