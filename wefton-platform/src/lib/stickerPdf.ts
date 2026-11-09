// ============================================================
// Wefton Copper — Product sticker sheet (server only)
// ============================================================
// Lays sticker series out on A4 in two parts:
// 1. Product stickers, 5.5 × 3.3 cm: each serial printed STICKER_COPIES
//    times, so one serial fills one row.
// 2. Tag stickers, 4.78 × 2.9 cm: each serial once more, in the same order,
//    TAG_STICKERS_PER_ROW to a row, for pasting on the 5.1 cm tag label.
//    They start right below the last product row to save paper.
// Series run on from each other with no gaps, page after page.
// Barcodes are drawn as vector bars (not images) so they stay sharp at
// any printer resolution and scan reliably.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import {
  STICKER_COPIES,
  STICKER_ROWS_PER_PAGE,
  TAG_ROWS_PER_PAGE,
  TAG_STICKERS_PER_ROW,
  formatSerial,
  type StickerSeries,
} from '@/lib/serialgen';

// ── Layout (points; 1cm = 28.3465pt) ──
const CM = 28.3465;
const MM = CM / 10;
const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const SECTION_GAP = 0.5 * CM; // between the product rows and the tag rows

// Code 128: keep bars ≥ 0.25mm wide (standard scanners) and leave a quiet
// zone of ≥ 10 modules either side inside the sticker.
const MAX_MODULE = 0.33 * MM;

interface StickerLayout {
  w: number;
  h: number;
  cols: number;
  rows: number;
  gap: number; // space between stickers, for cutting
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

// 167 modules at the 0.25mm minimum is 4.18 cm of bars, which leaves 3mm
// (12 modules) of quiet zone either side.
const TAG_LAYOUT: StickerLayout = {
  w: 4.78 * CM,
  h: 2.9 * CM,
  cols: TAG_STICKERS_PER_ROW,
  rows: TAG_ROWS_PER_PAGE,
  gap: 0.15 * CM,
  maxBarsW: 167 * 0.25 * MM,
  barsH: 1 * CM,
  barsTop: 0.15 * CM,
  serialDrop: 0.28 * CM,
  serialSize: 7,
  labelY: 0.62 * CM,
  valueY: 0.18 * CM,
  labelSize: 6.5,
  colsX: 0.09 * CM,
  colWidths: [1.05, 1.65, 1, 0.9],
  valueSizes: [9.5, 7, 9.5, 9.5],
};

const originX = (l: StickerLayout) => (PAGE_W - (l.cols * l.w + (l.cols - 1) * l.gap)) / 2;
const pageMargin = (l: StickerLayout) => (PAGE_H - (l.rows * l.h + (l.rows - 1) * l.gap)) / 2;

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
  while (s > 5 && font.widthOfTextAtSize(text, s) > maxW) s -= 0.25;
  return s;
}

function drawCentered(page: PDFPage, text: string, font: PDFFont, size: number, cx: number, y: number) {
  page.drawText(text, { x: cx - font.widthOfTextAtSize(text, size) / 2, y, size, font, color: rgb(0, 0, 0) });
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
    const barsX = x + (l.w - barsW) / 2;
    const barsY = y + l.h - l.barsTop - l.barsH;
    for (const [left, width] of bars.bars) {
      page.drawRectangle({ x: barsX + left * moduleW, y: barsY, width: width * moduleW, height: l.barsH, color: rgb(0, 0, 0) });
    }

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

  const items: Item[] = series.flatMap((s) =>
    Array.from({ length: s.end - s.start + 1 }, (_, i) => {
      const serial = formatSerial(s.prefix, s.start + i);
      return { series: s, serial, bars: parseBars(toSVG({ bcid: 'code128', text: serial, height: 10 })) };
    })
  );

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let top = PAGE_H - pageMargin(PRODUCT_LAYOUT); // where the next row starts

  /** Draws one row, moving to a new page when it would pass the bottom margin. */
  const drawRow = (l: StickerLayout, row: Item[]) => {
    if (top - l.h < pageMargin(l) - 0.01) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      top = PAGE_H - pageMargin(l);
    }
    row.forEach((item, c) => drawSticker(page, l, originX(l) + c * (l.w + l.gap), top - l.h, item));
    top -= l.h + l.gap;
  };

  for (const item of items) {
    drawRow(PRODUCT_LAYOUT, Array.from({ length: PRODUCT_LAYOUT.cols }, () => item));
  }

  top -= SECTION_GAP - PRODUCT_LAYOUT.gap;
  for (let i = 0; i < items.length; i += TAG_LAYOUT.cols) {
    drawRow(TAG_LAYOUT, items.slice(i, i + TAG_LAYOUT.cols));
  }

  return pdf.save();
}

export function buildStickerPdfName(series: StickerSeries[]): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `stickers_${series[0].prefix}_${series.length}-series_${stamp}.pdf`;
}
