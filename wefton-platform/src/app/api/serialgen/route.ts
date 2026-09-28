import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import {
  validateSerialConfig,
  buildSerials,
  buildPdfName,
  type SerialConfig,
} from '@/lib/serialgen';

// Barcode rendering requires the Node.js runtime.
export const runtime = 'nodejs';
// Generated on demand — never cache.
export const dynamic = 'force-dynamic';

// ── Page / label layout (points; 1pt = 1/72 inch; 1cm = 28.3465pt) ──
const CM = 28.3465;
const PAGE_W = 595.28; // A4 portrait width  (21 cm)
const PAGE_H = 841.89; // A4 portrait height (29.7 cm)
const MARGIN = 1 * CM; // ~1 cm margin all round
// Each label is 5 cm (w) x 2 cm (h) per the print/sticker spec.
const LABEL_W = 5 * CM;
const LABEL_H = 2 * CM;
const CELL_GAP_X = 0.3 * CM;
const CELL_GAP_Y = 0.15 * CM;

// Fit as many 5x2 cm labels as possible into the usable A4 area.
const USABLE_W = PAGE_W - MARGIN * 2;
const USABLE_H = PAGE_H - MARGIN * 2;
const COLS = Math.max(1, Math.floor((USABLE_W + CELL_GAP_X) / (LABEL_W + CELL_GAP_X)));
const ROWS = Math.max(1, Math.floor((USABLE_H + CELL_GAP_Y) / (LABEL_H + CELL_GAP_Y)));
const PER_PAGE = COLS * ROWS;

/**
 * POST /api/serialgen
 * Body: { prefix, suffix, start, end, increment, barcodeType? }
 *
 * Generates a high-quality barcode per serial, lays them out in sequence
 * order into a single PDF (grid, one cell per serial, each labelled), and
 * returns the PDF directly for the user to download. Intended for sending to
 * print vendors (e.g. inkless thermal sticker printing). Nothing is written
 * to server storage, so it works locally and on the deployed app.
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

  const bcid = body.barcodeType === 'qrcode' ? 'qrcode' : 'code128';

  let toBuffer: typeof import('bwip-js/node').toBuffer;
  try {
    ({ toBuffer } = await import('bwip-js/node'));
  } catch (e) {
    console.error('[serialgen] Failed to load bwip-js:', e);
    return NextResponse.json({ error: 'Barcode engine is not available.' }, { status: 503 });
  }

  const serials = buildSerials(cfg);

  try {
    // Render each barcode as a high-resolution PNG. A high scale keeps the
    // barcode crisp when the vendor prints at thermal-sticker DPI (embedded
    // at native pixel size, so no upscaling blur).
    const pngs: Uint8Array[] = [];
    for (const serial of serials) {
      const png = await toBuffer({
        bcid,
        text: serial,
        scale: 6, // high-res for print quality
        height: bcid === 'qrcode' ? undefined : 14,
        includetext: true,
        textxalign: 'center',
        backgroundcolor: 'FFFFFF',
        paddingwidth: 4,
        paddingheight: 4,
      });
      pngs.push(new Uint8Array(png));
    }

    // Build the PDF, placing barcodes in strict sequence order.
    const pdf = await PDFDocument.create();
    pdf.setTitle(`Wefton barcodes ${serials[0]}–${serials[serials.length - 1]}`);
    pdf.setCreator('Wefton Copper — Serial Generator');

    // Center the grid of fixed-size 5x2 cm labels within the usable area.
    const gridTotalW = COLS * LABEL_W + (COLS - 1) * CELL_GAP_X;
    const gridTotalH = ROWS * LABEL_H + (ROWS - 1) * CELL_GAP_Y;
    const originX = MARGIN + (USABLE_W - gridTotalW) / 2;
    const originTop = PAGE_H - MARGIN - (USABLE_H - gridTotalH) / 2;

    // The barcode's own text (serial) is rendered under the bars by bwip-js
    // (includetext), so each 5x2 cm cell holds the complete labelled barcode.
    let page = pdf.addPage([PAGE_W, PAGE_H]);

    for (let i = 0; i < serials.length; i++) {
      const posInPage = i % PER_PAGE;
      if (i > 0 && posInPage === 0) {
        page = pdf.addPage([PAGE_W, PAGE_H]);
      }
      const col = posInPage % COLS;
      const row = Math.floor(posInPage / COLS);

      // Cell rectangle (PDF origin is bottom-left).
      const cellX = originX + col * (LABEL_W + CELL_GAP_X);
      const cellY = originTop - row * (LABEL_H + CELL_GAP_Y) - LABEL_H;

      const png = await pdf.embedPng(pngs[i]);
      // Fit the barcode inside the 5x2 cm cell, preserving aspect ratio.
      const scale = Math.min(LABEL_W / png.width, LABEL_H / png.height);
      const drawW = png.width * scale;
      const drawH = png.height * scale;
      const imgX = cellX + (LABEL_W - drawW) / 2;
      const imgY = cellY + (LABEL_H - drawH) / 2;

      page.drawImage(png, { x: imgX, y: imgY, width: drawW, height: drawH });
    }

    const pdfBytes = await pdf.save();
    const pdfName = buildPdfName(cfg);

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfName}"`,
        'Content-Length': String(pdfBytes.length),
        'Cache-Control': 'no-store',
        'X-Serial-Count': String(serials.length),
        'X-Serial-First': encodeURIComponent(serials[0]),
        'X-Serial-Last': encodeURIComponent(serials[serials.length - 1]),
        'X-Serial-Filename': pdfName,
      },
    });
  } catch (e) {
    console.error('[serialgen] Generation failed:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: `Barcode generation failed: ${message}` }, { status: 500 });
  }
}
