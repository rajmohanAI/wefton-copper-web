// ============================================================
// Wefton Copper — Product sticker sheet
// ============================================================
import { writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { estimateStickerPages, planSeries, STICKER_COPIES, STICKERS_PER_PAGE, welcomeUrl } from '@/lib/serialgen';
import { buildStickerPdfName, parseQr, renderStickerPdf, STICKER_GENDER } from '@/lib/stickerPdf';

describe('sticker sheet', () => {
  it('prints 3 copies per serial, 7 rows per A4 page', async () => {
    const base = { modelId: 'P01', gender: 'W' as const, colorCode: '01', colorName: 'Olive Green', size: 'M', quantity: 5 };
    // 5 + 4 serials = 9 product rows (7 + 2), then 3 rows of tag labels: 2 fit
    // below the last product row, the third goes to page 3.
    const { series } = planSeries([base, { ...base, size: 'L', quantity: 4 }], {});
    const bytes = await renderStickerPdf(series);
    if (process.env.STICKER_PDF_OUT) writeFileSync(process.env.STICKER_PDF_OUT, bytes);
    const pdf = await PDFDocument.load(bytes);
    expect(STICKERS_PER_PAGE).toBe(21);
    expect(pdf.getPageCount()).toBe(3);
    expect(Math.round(pdf.getPage(0).getWidth())).toBe(595);
  });

  it('adds tag labels after the product rows, 12 per page', async () => {
    const base = { modelId: 'P01', gender: 'M' as const, colorCode: '01', colorName: 'Olive Green', size: 'M' };
    const pages = async (quantity: number) => {
      const { series } = planSeries([{ ...base, quantity }], {});
      return (await PDFDocument.load(await renderStickerPdf(series))).getPageCount();
    };
    // 2 product rows leave room for 1 label row on the same page.
    expect(await pages(2)).toBe(1);
    // 6 product rows leave less than a label's height, so labels go to page 2.
    expect(await pages(6)).toBe(2);
    // 24 product rows = 3 full pages + 3 rows on page 4, which also takes 1
    // row of labels; the other 5 label rows (20 labels) need 2 more pages.
    expect(await pages(24)).toBe(6);
    expect(estimateStickerPages(24)).toBe(6);
  });

  it('shows gender as M / F / U', () => {
    expect(STICKER_GENDER).toEqual({ M: 'M', W: 'F', U: 'U' });
  });

  it('points the tag QR at the serial welcome page', async () => {
    expect(welcomeUrl('WCP01M0103000001')).toBe('https://www.weftoncopper.com/welcomeuser/WCP01M0103000001');
    const { toSVG } = await import('bwip-js/node');
    const qr = parseQr(toSVG({ bcid: 'qrcode', text: welcomeUrl('WCP01M0103000001').toUpperCase() }));
    // Upper case stays in alphanumeric mode: a 29-module (version 3) QR, 4 units a module.
    expect(qr.units).toBe(29 * 4);
    expect(qr.path.startsWith('M')).toBe(true);
  });

  describe('2-inch roll PDFs (WC-Issue-15)', () => {
    const { series } = planSeries(
      [{ modelId: 'P01', gender: 'M', colorCode: '01', colorName: 'Olive Green', size: 'XL', quantity: 4 }],
      {},
    );
    const pages = async (format: 'roll-stickers' | 'roll-tags') =>
      (await PDFDocument.load(await renderStickerPdf(series, format))).getPages();

    it('puts every product sticker on its own 2-inch page', async () => {
      const p = await pages('roll-stickers');
      expect(p).toHaveLength(4 * STICKER_COPIES);
      expect(Math.round(p[0].getWidth())).toBe(144);
      // 1.5 in sticker plus the 5 mm cut zone.
      expect(Math.round(p[0].getHeight())).toBe(122);
    });

    it('puts one tag label per serial on its own 2-inch page', async () => {
      const p = await pages('roll-tags');
      expect(p).toHaveLength(4);
      expect(Math.round(p[0].getWidth())).toBe(144);
      expect(Math.round(p[0].getHeight())).toBe(266);
    });

    it('names the roll files apart from the A4 sheet', () => {
      expect(buildStickerPdfName(series, 'roll-stickers')).toMatch(/^stickers_roll-stickers_/);
      expect(buildStickerPdfName(series, 'roll-tags')).toMatch(/^stickers_roll-tags_/);
      expect(buildStickerPdfName(series)).not.toMatch(/roll/);
    });
  });
});
