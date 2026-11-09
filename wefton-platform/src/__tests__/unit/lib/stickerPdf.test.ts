// ============================================================
// Wefton Copper — Product sticker sheet
// ============================================================
import { writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { estimateStickerPages, planSeries, STICKERS_PER_PAGE } from '@/lib/serialgen';
import { renderStickerPdf, STICKER_GENDER } from '@/lib/stickerPdf';

describe('sticker sheet', () => {
  it('prints 3 copies per serial, 8 rows per A4 page', async () => {
    const base = { modelId: 'P01', gender: 'W' as const, colorCode: '01', colorName: 'Olive Green', size: 'M', quantity: 5 };
    // 5 + 4 serials = 9 rows → 2 pages.
    const { series } = planSeries([base, { ...base, size: 'L', quantity: 4 }], {});
    const bytes = await renderStickerPdf(series);
    if (process.env.STICKER_PDF_OUT) writeFileSync(process.env.STICKER_PDF_OUT, bytes);
    const pdf = await PDFDocument.load(bytes);
    expect(STICKERS_PER_PAGE).toBe(24);
    expect(pdf.getPageCount()).toBe(2);
    expect(Math.round(pdf.getPage(0).getWidth())).toBe(595);
  });

  it('adds tag stickers below the product rows, 4 per row and 9 rows per page', async () => {
    const base = { modelId: 'P01', gender: 'M' as const, colorCode: '01', colorName: 'Olive Green', size: 'M' };
    const pages = async (quantity: number) => {
      const { series } = planSeries([{ ...base, quantity }], {});
      return (await PDFDocument.load(await renderStickerPdf(series))).getPageCount();
    };
    // 4 product rows leave room for the 1 tag row on the same page.
    expect(await pages(4)).toBe(1);
    // 8 product rows fill the page, so the tag rows start on page 2.
    expect(await pages(8)).toBe(2);
    // 72 product rows = 9 full pages, then 18 tag rows = 2 more.
    expect(await pages(72)).toBe(11);
    expect(estimateStickerPages(72)).toBe(11);
  });

  it('shows gender as M / F / U', () => {
    expect(STICKER_GENDER).toEqual({ M: 'M', W: 'F', U: 'U' });
  });
});
