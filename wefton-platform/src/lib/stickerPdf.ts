// ============================================================
// Wefton Copper — Product sticker sheet (server only)
// ============================================================
// Lays sticker series out on A4 in two parts:
// 1. Product stickers, 2 × 1.5 in (5.08 × 3.81 cm): each serial printed STICKER_COPIES
//    times, so one serial fills one row. The same welcome-page QR as the
//    tag, with the serial beside it and Prod / Color / Gender / Size below.
// 2. Tag labels, 2 × 3.5 in (5.08 × 8.89 cm): each serial once more, in the same order, as
//    the full garment tag (black U notch for the punch at the top centre,
//    fixed complaints, product and MRP text; then a QR that opens the serial's
//    welcome page, the serial and Prod / Color / Gender / Size below),
//    TAG_LABELS_PER_ROW to a row. They start right below the last product
//    row when a label still fits there, else on the next page.
// Series run on from each other with no gaps, page after page.
// QRs are drawn as vector shapes (not images) so they stay
// sharp at any printer resolution and scan reliably.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import {
  STICKER_COPIES,
  STICKER_ROWS_PER_PAGE,
  TAG_LABELS_PER_ROW,
  TAG_LABEL_ROWS_PER_PAGE,
  formatSerial,
  type StickerSeries,
  welcomeUrl,
} from '@/lib/serialgen';

// ── Layout (points; 1cm = 28.3465pt) ──
const CM = 28.3465;
const MM = CM / 10;
const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const SECTION_GAP = 0.5 * CM; // between the product rows and the tag rows
const BLACK = rgb(0, 0, 0);

interface StickerLayout extends Grid {
  qrSize: number;
  qrInset: number; // from the sticker's top and left edges
  serialSize: number;
  labelY: number; // from the sticker's bottom edge
  valueY: number;
  labelSize: number;
  colsX: number; // bottom row starts this far in
  /** Bottom row widths (cm) for Prod, Color, Gender, Size. */
  colWidths: [number, number, number, number];
  valueSizes: [number, number, number, number];
}

const PRODUCT_LAYOUT: StickerLayout = {
  w: 2 * 72, // standard 2 × 1.5 inch label
  h: 1.5 * 72,
  cols: STICKER_COPIES,
  rows: STICKER_ROWS_PER_PAGE,
  gap: 0.2 * CM,
  qrSize: 2.05 * CM,
  qrInset: 0.15 * CM,
  serialSize: 8,
  labelY: 0.75 * CM,
  valueY: 0.25 * CM,
  labelSize: 7.5,
  colsX: 0.1 * CM,
  colWidths: [1.1, 1.75, 1.05, 0.98],
  valueSizes: [11, 7.5, 11, 11],
};

/** Where stickers of one size sit on the page. */
interface Grid {
  w: number;
  h: number;
  cols: number;
  rows: number;
  gap: number; // between columns
  /** Between rows; defaults to `gap`. */
  rowGap?: number;
}

// Tag label. The U notch at the top centre is where the tag is punched; the
// QR at the bottom opens the serial's welcome page (product, wash care,
// review).
// Standard 2 × 3.5 inch hang tag. Four across A4 leave room for only a
// 1 mm gap between columns (about 2 mm side margins); rows get 3 mm.
const INCH = 72;
const TAG_LABEL = {
  w: 2 * INCH,
  h: 3.5 * INCH,
  cols: TAG_LABELS_PER_ROW,
  rows: TAG_LABEL_ROWS_PER_PAGE,
  gap: 1 * MM,
  rowGap: 3 * MM,
  pad: 0.22 * CM,
  notchW: 10 * MM,
  notchH: 12 * MM,
  qrSize: 2 * CM,
};

// Fixed text on every tag label.
const TAG_TEXT = {
  thanks: 'We thank you for choosing our product',
  complaints: ['For Customer Complaints, write to', 'sales@weftoncopper.com'],
  product: ['Product: Crew Neck T Shirt', 'Net Quantity - 1', 'Country Of Origin - India'],
  mrpLabel: 'MAX RETAIL PRICE (Inclusive Of All Taxes)',
  mrp: '689',
  website: 'www.weftoncopper.com',
};

// Brand mark (the "W" monogram), traced from the brand artwork as seven
// polygons on an 830 × 535 box, y down. Vector, so it prints sharp.
const LOGO = {
  path: 'M470 306 L426 394 L473 495 L582 534 Z M417 201 L297 437 L251 535 L358 495 L460 289 Z M830 42 L694 108 L546 407 L558 437 L594 507 Z M1 40 L239 508 L288 408 L140 106 Z M829 11 L609 39 L539 188 L586 275 L678 90 L813 28 Z M0 10 L19 28 L156 91 L248 276 L294 188 L224 38 Z M416 0 L324 166 L255 298 L298 389 L416 159 L534 389 L578 300 Z',
  w: 830,
  h: 535,
};

/** Draws the brand mark `width` wide with its top-left corner at (x, top). */
function drawLogo(page: PDFPage, x: number, top: number, width: number) {
  page.drawSvgPath(LOGO.path, { x, y: top, scale: width / LOGO.w, color: BLACK });
}

const logoHeight = (width: number) => (width * LOGO.h) / LOGO.w;

const originX = (l: Grid) => (PAGE_W - (l.cols * l.w + (l.cols - 1) * l.gap)) / 2;
const rowGap = (l: Grid) => l.rowGap ?? l.gap;
const pageMargin = (l: Grid) => (PAGE_H - (l.rows * l.h + (l.rows - 1) * rowGap(l))) / 2;

/** Gender on the sticker reads M / F / U (the serial itself uses W for women). */
export const STICKER_GENDER: Record<StickerSeries['gender'], string> = { M: 'M', W: 'F', U: 'U' };

// Bottom row of the sticker; Color gets the widest column for its name.
const STICKER_COLUMNS: { label: string; value: (s: StickerSeries) => string }[] = [
  { label: 'Prod', value: (s) => s.modelId },
  { label: 'Color', value: (s) => s.colorName },
  { label: 'Gender', value: (s) => STICKER_GENDER[s.gender] },
  { label: 'Size', value: (s) => s.size },
];

/** A QR as one SVG path (bwip-js output, y down, no quiet zone). */
interface Qr {
  path: string;
  units: number; // width = height of the path, in its own units
}

/** Pulls the single path out of bwip-js SVG output for a QR code. */
export function parseQr(svg: string): Qr {
  const viewBox = /viewBox="0 0 ([\d.]+) [\d.]+"/.exec(svg);
  const path = /<path d="([^"]+)"/.exec(svg);
  if (!viewBox || !path) throw new Error('Unexpected QR SVG');
  return { path: path[1], units: Number(viewBox[1]) };
}

interface Item {
  series: StickerSeries;
  serial: string;
  qr: Qr;
}

/** Shrinks the font size until `text` fits `maxW`. */
function fitSize(font: PDFFont, text: string, size: number, maxW: number): number {
  let s = size;
  while (s > 4 && font.widthOfTextAtSize(text, s) > maxW) s -= 0.1;
  return s;
}

function drawCentered(page: PDFPage, text: string, font: PDFFont, size: number, cx: number, y: number) {
  page.drawText(text, { x: cx - font.widthOfTextAtSize(text, size) / 2, y, size, font, color: BLACK });
}

function drawRule(page: PDFPage, x: number, y: number, w: number) {
  page.drawRectangle({ x, y, width: w, height: 0.9, color: BLACK });
}

/** ₹ drawn as a path, since the standard PDF fonts have no rupee sign. Returns its width. */
function drawRupee(page: PDFPage, x: number, baseline: number, capHeight: number): number {
  const scale = capHeight / 10; // path drawn on a 7 × 10 box, y down
  page.drawSvgPath(
    'M0 0 H7 V1.2 H4.6 C5.2 1.7 5.5 2.3 5.6 2.9 H7 V4.1 H5.6 C5.4 5.6 4.1 6.6 2.2 6.7 L6.6 10 H4.6 L0.4 6.8 V5.6 H2 C3.3 5.6 4.1 5 4.3 4.1 H0 V2.9 H4.3 C4.1 1.9 3.3 1.2 2 1.2 H0 Z',
    { x, y: baseline + capHeight, scale, color: BLACK }
  );
  return 7 * scale;
}

function drawEnvelope(page: PDFPage, x: number, y: number, w: number, h: number) {
  page.drawRectangle({ x, y, width: w, height: h, color: BLACK });
  page.drawSvgPath(`M0 0 L${w / 2} ${h * 0.55} L${w} 0`, { x, y: y + h, borderColor: rgb(1, 1, 1), borderWidth: 1.1 });
}

/** Black U notch hanging from the top edge, centred on `cx`: straight sides, round bottom. */
function drawNotch(page: PDFPage, cx: number, top: number, w: number, h: number) {
  const r = w / 2;
  page.drawSvgPath(`M0 0 V${h - r} A${r} ${r} 0 0 0 ${w} ${h - r} V0 Z`, { x: cx - r, y: top, color: BLACK });
}

/** Dashed cut line across the roll with a small scissors mark at the left. */
function drawCutLine(page: PDFPage, y: number, w: number) {
  // Scissors: two rings and crossing blades, about 3 mm wide.
  page.drawCircle({ x: 3, y: y + 1.6, size: 1.3, borderColor: BLACK, borderWidth: 0.6 });
  page.drawCircle({ x: 3, y: y - 1.6, size: 1.3, borderColor: BLACK, borderWidth: 0.6 });
  page.drawLine({ start: { x: 4, y: y + 0.8 }, end: { x: 10, y: y - 1.2 }, thickness: 0.6, color: BLACK });
  page.drawLine({ start: { x: 4, y: y - 0.8 }, end: { x: 10, y: y + 1.2 }, thickness: 0.6, color: BLACK });
  page.drawLine({ start: { x: 12, y }, end: { x: w - 2, y }, thickness: 0.6, color: BLACK, dashArray: [3, 2] });
}

function drawQr(page: PDFPage, qr: Qr, x: number, top: number, size: number) {
  page.drawSvgPath(qr.path, { x, y: top, scale: size / qr.units, color: BLACK });
}

/**
 * 'a4' is the sheet above. The roll formats are for a 2-inch thermal pocket
 * printer, one per paper roll (WC-Issue-15): 'roll-stickers' has every
 * product sticker (STICKER_COPIES per serial), 'roll-tags' every tag label.
 */
export type StickerFormat = 'a4' | 'roll-stickers' | 'roll-tags';

// Roll: one label per page, each followed by a dashed cut line. Thermal
// printers print black only, so roll labels have no grey border.
const ROLL = {
  w: 2 * INCH,
  cutZone: 5 * MM, // blank space below each label, with the cut line in the middle
};

export async function renderStickerPdf(series: StickerSeries[], format: StickerFormat = 'a4'): Promise<Uint8Array> {
  const { toSVG } = await import('bwip-js/node');

  const pdf = await PDFDocument.create();
  const first = series[0];
  const last = series[series.length - 1];
  pdf.setTitle(`Wefton stickers ${formatSerial(first.prefix, first.start)}–${formatSerial(last.prefix, last.end)}`);
  pdf.setCreator('Wefton Copper — Serial Generator');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const drawSticker = (page: PDFPage, l: StickerLayout, x: number, y: number, item: Item) => {
    const { series: s, serial, qr } = item;
    // Cut guide (A4 only: on the roll the paper edge and cut line do this).
    if (format === 'a4') {
      page.drawRectangle({
        x, y, width: l.w, height: l.h,
        borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.4,
      });
    }

    // QR top left; brand and serial beside it.
    const qrX = x + l.qrInset;
    const qrTop = y + l.h - l.qrInset;
    drawQr(page, qr, qrX, qrTop, l.qrSize);
    const sideX = qrX + l.qrSize + 0.2 * CM;
    const sideW = x + l.w - 0.12 * CM - sideX;
    const sideCx = sideX + sideW / 2;
    const midY = qrTop - l.qrSize / 2;
    const logoW = 0.95 * CM;
    drawLogo(page, sideCx - logoW / 2, midY + logoHeight(logoW) + 1, logoW);
    drawCentered(page, serial, mono, fitSize(mono, serial, l.serialSize, sideW), sideCx, midY - l.serialSize - 2);

    let colX = x + l.colsX;
    STICKER_COLUMNS.forEach(({ label, value }, i) => {
      const colW = l.colWidths[i] * CM;
      const colCx = colX + colW / 2;
      const text = value(s);
      drawCentered(page, label, regular, l.labelSize, colCx, y + l.labelY);
      drawCentered(page, text, bold, fitSize(bold, text, l.valueSizes[i], colW - 0.1 * CM), colCx, y + l.valueY);
      colX += colW;
    });
  };

  /** The full garment tag: punch notch and fixed text on top, the serial's QR below the website. */
  const drawTagLabel = (page: PDFPage, x: number, y: number, item: Item) => {
    const { series: s, serial, qr } = item;
    const { w, h, pad } = TAG_LABEL;
    const inner = w - 2 * pad;
    const cx = x + w / 2;
    if (format === 'a4') {
      page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.4 });
    }
    drawNotch(page, cx, y + h, TAG_LABEL.notchW, TAG_LABEL.notchH);

    // Running baseline, moving down the label, starting below the notch.
    // Running baseline, moving down the label, from just below the notch.
    let top = y + h - TAG_LABEL.notchH + 0.5;
    let size: number;
    top -= 4;
    drawRule(page, x + pad, top, inner);

    size = fitSize(bold, TAG_TEXT.thanks, 6.6, inner);
    top -= size + 4;
    drawCentered(page, TAG_TEXT.thanks, bold, size, cx, top);
    const iconW = 0.62 * CM;
    const textCx = x + pad + iconW + (inner - iconW) / 2 + 2;
    top -= 6.5;
    drawCentered(page, TAG_TEXT.complaints[0], regular, 5.4, textCx, top);
    top -= 7.5;
    drawCentered(page, TAG_TEXT.complaints[1], regular, 5.4, textCx, top);
    drawEnvelope(page, x + pad + 1, top - 1, iconW, 0.42 * CM);
    top -= 7;
    drawRule(page, x + pad, top, inner);

    for (const line of TAG_TEXT.product) {
      top -= 8.6;
      page.drawText(line, { x: x + pad, y: top, size: fitSize(regular, line, 7.2, inner), font: regular, color: BLACK });
    }
    top -= 4.5;
    drawRule(page, x + pad, top, inner);

    size = fitSize(regular, TAG_TEXT.mrpLabel, 7, inner);
    top -= size + 4;
    drawCentered(page, TAG_TEXT.mrpLabel, regular, size, cx, top);
    const priceSize = 16;
    const capHeight = bold.heightAtSize(priceSize, { descender: false }) * 0.72;
    top -= priceSize + 1;
    const priceW = capHeight * 0.7 + 1.5 + bold.widthOfTextAtSize(TAG_TEXT.mrp, priceSize);
    const priceX = cx - priceW / 2;
    const rupeeW = drawRupee(page, priceX, top, capHeight);
    page.drawText(TAG_TEXT.mrp, { x: priceX + rupeeW + 1.5, y: top, size: priceSize, font: bold, color: BLACK });
    top -= 10;
    drawCentered(page, TAG_TEXT.website, regular, 5.6, cx, top);

    // Serial part, laid out like the product sticker: the QR (opens this
    // piece's welcome page) on the left, brand mark over the serial beside
    // it, the pair centred between the website line and the bottom row.
    const rowTop = y + 0.62 * CM + 6.5 + 4; // just above the Prod / Color labels
    const qrTop = rowTop + (top - 2 - rowTop + TAG_LABEL.qrSize) / 2;
    const qrX = x + pad;
    drawQr(page, qr, qrX, qrTop, TAG_LABEL.qrSize);
    const sideX = qrX + TAG_LABEL.qrSize + 0.15 * CM;
    const sideW = x + w - pad - sideX;
    const sideCx = sideX + sideW / 2;
    const midY = qrTop - TAG_LABEL.qrSize / 2;
    const markW = 1.05 * CM;
    drawLogo(page, sideCx - markW / 2, midY + logoHeight(markW) + 1, markW);
    drawCentered(page, serial, mono, fitSize(mono, serial, 7.5, sideW), sideCx, midY - 8);

    const colWidths = [1.12, 1.72, 1.06, 0.74];
    let colX = x + pad - 0.05 * CM;
    STICKER_COLUMNS.forEach(({ label, value }, i) => {
      const colW = colWidths[i] * CM;
      const colCx = colX + colW / 2;
      const text = value(s);
      drawCentered(page, label, regular, 6.5, colCx, y + 0.62 * CM);
      drawCentered(page, text, bold, fitSize(bold, text, label === 'Color' ? 7 : 10, colW - 0.08 * CM), colCx, y + 0.2 * CM);
      colX += colW;
    });
  };

  const items: Item[] = series.flatMap((s) =>
    Array.from({ length: s.end - s.start + 1 }, (_, i) => {
      const serial = formatSerial(s.prefix, s.start + i);
      return {
        series: s,
        serial,
        // Upper case keeps the QR in alphanumeric mode: fewer, bigger modules.
        qr: parseQr(toSVG({ bcid: 'qrcode', text: welcomeUrl(serial).toUpperCase() })),
      };
    })
  );

  if (format !== 'a4') {
    // One label per page, in serial order, each followed by a cut line.
    const rollLabel = (h: number, draw: (page: PDFPage, x: number, y: number) => void) => {
      const p = pdf.addPage([ROLL.w, h + ROLL.cutZone]);
      draw(p, 0, ROLL.cutZone);
      drawCutLine(p, ROLL.cutZone / 2, ROLL.w);
    };
    for (const item of items) {
      if (format === 'roll-stickers') {
        for (let c = 0; c < STICKER_COPIES; c++) {
          rollLabel(PRODUCT_LAYOUT.h, (p, x, y) => drawSticker(p, PRODUCT_LAYOUT, x, y, item));
        }
      } else {
        rollLabel(TAG_LABEL.h, (p, x, y) => drawTagLabel(p, x, y, item));
      }
    }
    return pdf.save();
  }

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let top = PAGE_H - pageMargin(PRODUCT_LAYOUT); // where the next row starts

  /** Draws one row, moving to a new page when it would pass the bottom margin. */
  const drawRow = (l: Grid, row: Item[], draw: (page: PDFPage, x: number, y: number, item: Item) => void) => {
    if (top - l.h < pageMargin(l) - 0.01) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      top = PAGE_H - pageMargin(l);
    }
    row.forEach((item, c) => draw(page, originX(l) + c * (l.w + l.gap), top - l.h, item));
    top -= l.h + rowGap(l);
  };

  const drawProduct = (page: PDFPage, x: number, y: number, item: Item) => drawSticker(page, PRODUCT_LAYOUT, x, y, item);
  for (const item of items) {
    drawRow(PRODUCT_LAYOUT, Array.from({ length: PRODUCT_LAYOUT.cols }, () => item), drawProduct);
  }

  top -= SECTION_GAP - rowGap(PRODUCT_LAYOUT);
  for (let i = 0; i < items.length; i += TAG_LABEL.cols) {
    drawRow(TAG_LABEL, items.slice(i, i + TAG_LABEL.cols), drawTagLabel);
  }

  return pdf.save();
}

export function buildStickerPdfName(series: StickerSeries[], format: StickerFormat = 'a4'): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const kind = format === 'roll-stickers' ? 'roll-stickers_' : format === 'roll-tags' ? 'roll-tags_' : '';
  return `stickers_${kind}${series[0].prefix}_${series.length}-series_${stamp}.pdf`;
}
