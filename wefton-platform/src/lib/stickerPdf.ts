// ============================================================
// Wefton Copper — Product sticker sheet (server only)
// ============================================================
// Lays sticker series out on A4: 5.5 × 3.3 cm stickers, 3 per row, and
// each serial printed STICKER_COPIES times so one serial fills one row.
// Series run on from each other with no gaps, page after page.
// Barcodes are drawn as vector bars (not images) so they stay sharp at
// any printer resolution and scan reliably.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { STICKER_COPIES, STICKER_ROWS_PER_PAGE, formatSerial, type StickerSeries } from '@/lib/serialgen';

// ── Layout (points; 1cm = 28.3465pt) ──
const CM = 28.3465;
const MM = CM / 10;
const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const STICKER_W = 5.5 * CM;
const STICKER_H = 3.3 * CM;
const COLS = STICKER_COPIES; // 3
const ROWS = STICKER_ROWS_PER_PAGE;
const GAP = 0.2 * CM; // space between stickers, for cutting
const ORIGIN_X = (PAGE_W - (COLS * STICKER_W + (COLS - 1) * GAP)) / 2;
const ORIGIN_TOP = PAGE_H - (PAGE_H - (ROWS * STICKER_H + (ROWS - 1) * GAP)) / 2;

// Code 128: keep bars ≥ 0.25mm wide (standard scanners) and leave a quiet
// zone of ≥ 10 modules either side inside the sticker.
const MAX_MODULE = 0.33 * MM;
const MAX_BARS_W = 4.8 * CM;
const BARS_H = 1.2 * CM;

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

  const drawSticker = (page: PDFPage, x: number, y: number, s: StickerSeries, serial: string, bars: Bars) => {
    // Cut guide.
    page.drawRectangle({
      x, y, width: STICKER_W, height: STICKER_H,
      borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.4,
    });

    const moduleW = Math.min(MAX_MODULE, MAX_BARS_W / bars.modules);
    const barsW = bars.modules * moduleW;
    const barsX = x + (STICKER_W - barsW) / 2;
    const barsY = y + STICKER_H - 0.2 * CM - BARS_H;
    for (const [left, width] of bars.bars) {
      page.drawRectangle({ x: barsX + left * moduleW, y: barsY, width: width * moduleW, height: BARS_H, color: rgb(0, 0, 0) });
    }

    const cx = x + STICKER_W / 2;
    drawCentered(page, serial, mono, fitSize(mono, serial, 8, barsW), cx, barsY - 0.33 * CM);

    // Prod / Color / Size, as on the sample sticker.
    const colW = STICKER_W / 3;
    const labelY = y + 0.75 * CM;
    const valueY = y + 0.25 * CM;
    const cols: [string, string][] = [['Prod', s.modelId], ['Color', s.colorName], ['Size', s.size]];
    cols.forEach(([label, value], i) => {
      const colCx = x + colW * i + colW / 2;
      drawCentered(page, label, regular, 8, colCx, labelY);
      const size = fitSize(bold, value, i === 1 ? 7.5 : 11, colW - 0.2 * CM);
      drawCentered(page, value, bold, size, colCx, valueY);
    });
  };

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let row = 0;
  for (const s of series) {
    for (let n = s.start; n <= s.end; n++) {
      if (row === ROWS) {
        page = pdf.addPage([PAGE_W, PAGE_H]);
        row = 0;
      }
      const serial = formatSerial(s.prefix, n);
      const bars = parseBars(toSVG({ bcid: 'code128', text: serial, height: 10 }));
      const y = ORIGIN_TOP - row * (STICKER_H + GAP) - STICKER_H;
      for (let c = 0; c < COLS; c++) {
        drawSticker(page, ORIGIN_X + c * (STICKER_W + GAP), y, s, serial, bars);
      }
      row++;
    }
  }

  return pdf.save();
}

export function buildStickerPdfName(series: StickerSeries[]): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `stickers_${series[0].prefix}_${series.length}-series_${stamp}.pdf`;
}
