import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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

// ── Page / grid layout (points; 1pt = 1/72 inch) ──────────────
const PAGE_W = 595.28; // A4 portrait width
const PAGE_H = 841.89; // A4 portrait height
const MARGIN = 28;      // ~0.39 inch
const COLS = 3;
const ROWS = 8;
const PER_PAGE = COLS * ROWS;
const LABEL_H = 12;     // space under each barcode for the serial text
const CELL_GAP = 8;

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
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    const gridW = PAGE_W - MARGIN * 2;
    const gridH = PAGE_H - MARGIN * 2;
    const cellW = (gridW - CELL_GAP * (COLS - 1)) / COLS;
    const cellH = (gridH - CELL_GAP * (ROWS - 1)) / ROWS;
    const imgAreaH = cellH - LABEL_H;

    let page = pdf.addPage([PAGE_W, PAGE_H]);

    for (let i = 0; i < serials.length; i++) {
      const posInPage = i % PER_PAGE;
      if (i > 0 && posInPage === 0) {
        page = pdf.addPage([PAGE_W, PAGE_H]);
      }
      const col = posInPage % COLS;
      const row = Math.floor(posInPage / COLS);

      const cellX = MARGIN + col * (cellW + CELL_GAP);
      // Top-down rows (PDF origin is bottom-left).
      const cellTop = PAGE_H - MARGIN - row * (cellH + CELL_GAP);

      const png = await pdf.embedPng(pngs[i]);
      // Fit the barcode within the image area preserving aspect ratio.
      const scale = Math.min(cellW / png.width, imgAreaH / png.height);
      const drawW = png.width * scale;
      const drawH = png.height * scale;
      const imgX = cellX + (cellW - drawW) / 2;
      const imgY = cellTop - LABEL_H - drawH; // leave label space below

      page.drawImage(png, { x: imgX, y: imgY, width: drawW, height: drawH });

      // Serial label centered under the barcode.
      const label = serials[i];
      const fontSize = 7;
      const textW = font.widthOfTextAtSize(label, fontSize);
      page.drawText(label, {
        x: cellX + (cellW - textW) / 2,
        y: imgY - LABEL_H + 3,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
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
