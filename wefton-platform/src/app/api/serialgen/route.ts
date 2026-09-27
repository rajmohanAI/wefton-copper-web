import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import {
  validateSerialConfig,
  buildSerials,
  serialToFilename,
  buildZipName,
  type SerialConfig,
} from '@/lib/serialgen';

// Barcode rendering requires the Node.js runtime.
export const runtime = 'nodejs';
// Generated on demand — never cache.
export const dynamic = 'force-dynamic';

/**
 * POST /api/serialgen
 * Body: { prefix, suffix, start, end, increment, barcodeType? }
 *
 * Generates a Code128 (or QR) barcode PNG per serial, zips them, and returns
 * the ZIP file directly in the response so the browser can download it and
 * save it to the user's device. Nothing is written to server storage, so this
 * works both locally and on the deployed app.
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
    const zipName = buildZipName(cfg);

    // Return the ZIP bytes directly so the browser downloads to the device.
    // Batch metadata is exposed via headers for the UI to display.
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'Content-Length': String(zipBuffer.length),
        'Cache-Control': 'no-store',
        'X-Serial-Count': String(serials.length),
        'X-Serial-First': encodeURIComponent(serials[0]),
        'X-Serial-Last': encodeURIComponent(serials[serials.length - 1]),
        'X-Serial-Filename': zipName,
      },
    });
  } catch (e) {
    console.error('[serialgen] Generation failed:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: `Barcode generation failed: ${message}` }, { status: 500 });
  }
}
