// ============================================================
// Wefton Copper — Product sticker sheet (server only)
// ============================================================
// Lays sticker series out on A4 in two parts:
// 1. Product stickers, 5.5 × 3.3 cm: each serial printed STICKER_COPIES
//    times, so one serial fills one row.
// 2. Tag labels, 4.8 × 8.5 cm: each serial once more, in the same order, as
//    the full garment tag (fixed brand, product, MRP and wash-care QR on
//    top; barcode, serial and Prod / Color / Gender / Size below),
//    TAG_LABELS_PER_ROW to a row. They start right below the last product
//    row when a label still fits there, else on the next page.
// Series run on from each other with no gaps, page after page.
// Barcodes are drawn as vector bars (not images) so they stay sharp at
// any printer resolution and scan reliably.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import {
  STICKER_COPIES,
  STICKER_ROWS_PER_PAGE,
  TAG_LABELS_PER_ROW,
  TAG_LABEL_ROWS_PER_PAGE,
  formatSerial,
  type StickerSeries,
} from '@/lib/serialgen';

// ── Layout (points; 1cm = 28.3465pt) ──
const CM = 28.3465;
const MM = CM / 10;
const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const SECTION_GAP = 0.5 * CM; // between the product rows and the tag rows
const BLACK = rgb(0, 0, 0);

// Code 128: keep bars ≥ 0.25mm wide (standard scanners) and leave a quiet
// zone of ≥ 10 modules either side inside the sticker.
const MAX_MODULE = 0.33 * MM;

interface StickerLayout extends Grid {
  maxBarsW: number;
  barsH: number;
  barsTop: number; // from the sticker's top edge
  serialDrop: number; // serial baseline, below the bars
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
  w: 5.5 * CM,
  h: 3.3 * CM,
  cols: STICKER_COPIES,
  rows: STICKER_ROWS_PER_PAGE,
  gap: 0.2 * CM,
  maxBarsW: 4.8 * CM,
  barsH: 1.2 * CM,
  barsTop: 0.2 * CM,
  serialDrop: 0.33 * CM,
  serialSize: 8,
  labelY: 0.75 * CM,
  valueY: 0.25 * CM,
  labelSize: 7.5,
  colsX: 0.1 * CM,
  colWidths: [1.2, 1.9, 1.1, 1.1],
  valueSizes: [11, 7.5, 11, 11],
};

/** Where stickers of one size sit on the page. */
interface Grid {
  w: number;
  h: number;
  cols: number;
  rows: number;
  gap: number;
}

// Tag label. The barcode keeps bars ≥ 0.25mm with a 3mm quiet zone either
// side, so it is a little wider than on the paper design.
const TAG_LABEL = {
  w: 4.8 * CM,
  h: 8.5 * CM,
  cols: TAG_LABELS_PER_ROW,
  rows: TAG_LABEL_ROWS_PER_PAGE,
  gap: 0.15 * CM,
  pad: 0.22 * CM,
  quietZone: 3 * MM,
  barsH: 1.15 * CM,
  qrSize: 1.45 * CM,
};

// Fixed text on every tag label.
const TAG_TEXT = {
  header: ['Designed And Sold By', 'Wefton Copper'],
  thanks: 'We thank you for choosing our product',
  complaints: ['For Customer Complaints, write to', 'sales@weftoncopper.com'],
  product: ['Product: Crew Neck T Shirt', 'Net Quantity - 1', 'Country Of Origin - India'],
  mrpLabel: 'MAX RETAIL PRICE (Inclusive Of All Taxes)',
  mrp: '689',
  washCare: 'Wash Care Instructions',
  website: 'www.weftoncopper.com',
};

// Wash-care QR (HTTPS://WWW.WEFTONCOPPER.COM/WC, the same code as
// public/wash-care-qr.png), one string per module row, # = dark.
// Drawn as vector squares so it prints sharp.
const WASH_CARE_QR = [
  '#######.#####.#...#######',
  '#.....#..#.####.#.#.....#',
  '#.###.#.#..#..#...#.###.#',
  '#.###.#..##....#..#.###.#',
  '#.###.#.....#.###.#.###.#',
  '#.....#.#..#...#..#.....#',
  '#######.#.#.#.#.#.#######',
  '.........#...##.#........',
  '#.#...##..##.#.#...#..#.#',
  '##..##.#...####..##.##..#',
  '#.##..##.#..#....#.#..#.#',
  '###..#.#.#.#.#.###.#.#..#',
  '##.##.##...#..#...#.####.',
  '.#..#...#.#..##...##.#..#',
  '#####.#...##.#.#.##.##.#.',
  '..##.#.##.#..#......#..#.',
  '##.####.#.####..#####..##',
  '........#.#.#...#...#####',
  '#######.#.#.###.#.#.#.##.',
  '#.....#....##..##...#####',
  '#.###.#......########.#..',
  '#.###.#..##..#...#.###...',
  '#.###.#.##.#....####..###',
  '#.....#..##..#.###...##.#',
  '#######.#.####...########',
];

const originX = (l: Grid) => (PAGE_W - (l.cols * l.w + (l.cols - 1) * l.gap)) / 2;
const pageMargin = (l: Grid) => (PAGE_H - (l.rows * l.h + (l.rows - 1) * l.gap)) / 2;

/** Gender on the sticker reads M / F / U (the serial itself uses W for women). */
export const STICKER_GENDER: Record<StickerSeries['gender'], string> = { M: 'M', W: 'F', U: 'U' };

// Bottom row of the sticker; Color gets the widest column for its name.
const STICKER_COLUMNS: { label: string; value: (s: StickerSeries) => string }[] = [
  { label: 'Prod', value: (s) => s.modelId },
  { label: 'Color', value: (s) => s.colorName },
  { label: 'Gender', value: (s) => STICKER_GENDER[s.gender] },
  { label: 'Size', value: (s) => s.size },
];

interface Bars {
  /** Bars as [left, width] in modules. */
  bars: [number, number][];
  modules: number;
}

/** Turns bwip-js SVG output (one stroked path per bar width) into bar rectangles. */
function parseBars(svg: string): Bars {
  const viewBox = /viewBox="0 0 ([\d.]+) [\d.]+"/.exec(svg);
  if (!viewBox) throw new Error('Unexpected barcode SVG');
  const units = Number(viewBox[1]);
  const bars: [number, number][] = [];
  for (const [, width, d] of svg.matchAll(/stroke-width="([\d.]+)" d="([^"]+)"/g)) {
    const w = Number(width);
    for (const [, x] of d.matchAll(/M([\d.]+) [\d.]+L[\d.]+ [\d.]+/g)) {
      bars.push([(Number(x) - w / 2) / 2, w / 2]);
    }
  }
  if (!bars.length) throw new Error('Barcode has no bars');
  return { bars, modules: units / 2 };
}

interface Item {
  series: StickerSeries;
  serial: string;
  bars: Bars;
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

function drawBars(page: PDFPage, bars: Bars, x: number, y: number, moduleW: number, h: number) {
  for (const [left, width] of bars.bars) {
    page.drawRectangle({ x: x + left * moduleW, y, width: width * moduleW, height: h, color: BLACK });
  }
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

function drawArrow(page: PDFPage, x: number, cy: number, w: number, h: number) {
  const shaft = h * 0.42;
  page.drawSvgPath(`M0 ${-shaft / 2} H${w * 0.55} V${-h / 2} L${w} 0 L${w * 0.55} ${h / 2} V${shaft / 2} H0 Z`, {
    x,
    y: cy,
    color: BLACK,
  });
}

function drawQr(page: PDFPage, x: number, top: number, size: number) {
  const m = size / WASH_CARE_QR.length;
  WASH_CARE_QR.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      // A hair of overlap so neighbouring squares print as one solid block.
      if (row[i] === '#') page.drawRectangle({ x: x + i * m, y: top - (j + 1) * m, width: m + 0.02, height: m + 0.02, color: BLACK });
    }
  });
}

export async function renderStickerPdf(series: StickerSeries[]): Promise<Uint8Array> {
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
    const { series: s, serial, bars } = item;
    // Cut guide.
    page.drawRectangle({
      x, y, width: l.w, height: l.h,
      borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.4,
    });

    const moduleW = Math.min(MAX_MODULE, l.maxBarsW / bars.modules);
    const barsW = bars.modules * moduleW;
    const barsY = y + l.h - l.barsTop - l.barsH;
    drawBars(page, bars, x + (l.w - barsW) / 2, barsY, moduleW, l.barsH);

    const cx = x + l.w / 2;
    drawCentered(page, serial, mono, fitSize(mono, serial, l.serialSize, barsW), cx, barsY - l.serialDrop);

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

  /** The full garment tag: fixed text and QR on top, the serial below the website. */
  const drawTagLabel = (page: PDFPage, x: number, y: number, item: Item) => {
    const { series: s, serial, bars } = item;
    const { w, h, pad } = TAG_LABEL;
    const inner = w - 2 * pad;
    const cx = x + w / 2;
    page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.4 });

    // Running baseline, moving down the label.
    let top = y + h - 0.32 * CM;
    let size = fitSize(bold, TAG_TEXT.header[0], 9.5, inner);
    top -= size;
    drawCentered(page, TAG_TEXT.header[0], bold, size, cx, top);
    size = fitSize(bold, TAG_TEXT.header[1], 11, inner);
    top -= size + 1;
    drawCentered(page, TAG_TEXT.header[1], bold, size, cx, top);
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
    const priceX = x + pad + inner * 0.38 - priceW / 2;
    const rupeeW = drawRupee(page, priceX, top, capHeight);
    page.drawText(TAG_TEXT.mrp, { x: priceX + rupeeW + 1.5, y: top, size: priceSize, font: bold, color: BLACK });

    // Wash-care QR on the right, level with the price, arrow pointing at it.
    const qrX = x + w - pad - TAG_LABEL.qrSize;
    const qrTop = top + priceSize * 0.35;
    drawQr(page, qrX, qrTop, TAG_LABEL.qrSize);
    const qrMid = qrTop - TAG_LABEL.qrSize / 2;
    size = fitSize(bold, TAG_TEXT.washCare, 6.2, qrX - x - pad - 0.62 * CM);
    page.drawText(TAG_TEXT.washCare, { x: x + pad, y: qrMid - size * 0.35, size, font: bold, color: BLACK });
    drawArrow(page, qrX - 0.55 * CM, qrMid, 0.45 * CM, 0.34 * CM);
    top = qrTop - TAG_LABEL.qrSize - 6.5;
    drawCentered(page, TAG_TEXT.website, regular, 5.6, cx, top);

    // Serial part.
    const moduleW = Math.min(MAX_MODULE, (w - 2 * TAG_LABEL.quietZone) / bars.modules);
    const barsW = bars.modules * moduleW;
    top -= 3 + TAG_LABEL.barsH;
    drawBars(page, bars, x + (w - barsW) / 2, top, moduleW, TAG_LABEL.barsH);
    top -= 8;
    drawCentered(page, serial, mono, fitSize(mono, serial, 7.5, barsW), cx, top);

    const colWidths = [1.05, 1.6, 1.0, 0.71];
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
      return { series: s, serial, bars: parseBars(toSVG({ bcid: 'code128', text: serial, height: 10 })) };
    })
  );

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let top = PAGE_H - pageMargin(PRODUCT_LAYOUT); // where the next row starts

  /** Draws one row, moving to a new page when it would pass the bottom margin. */
  const drawRow = (l: Grid, row: Item[], draw: (page: PDFPage, x: number, y: number, item: Item) => void) => {
    if (top - l.h < pageMargin(l) - 0.01) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      top = PAGE_H - pageMargin(l);
    }
    row.forEach((item, c) => draw(page, originX(l) + c * (l.w + l.gap), top - l.h, item));
    top -= l.h + l.gap;
  };

  const drawProduct = (page: PDFPage, x: number, y: number, item: Item) => drawSticker(page, PRODUCT_LAYOUT, x, y, item);
  for (const item of items) {
    drawRow(PRODUCT_LAYOUT, Array.from({ length: PRODUCT_LAYOUT.cols }, () => item), drawProduct);
  }

  top -= SECTION_GAP - PRODUCT_LAYOUT.gap;
  for (let i = 0; i < items.length; i += TAG_LABEL.cols) {
    drawRow(TAG_LABEL, items.slice(i, i + TAG_LABEL.cols), drawTagLabel);
  }

  return pdf.save();
}

export function buildStickerPdfName(series: StickerSeries[]): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `stickers_${series[0].prefix}_${series.length}-series_${stamp}.pdf`;
}
