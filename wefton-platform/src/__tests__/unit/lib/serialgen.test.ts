// ============================================================
// Wefton Copper — Product sticker serials
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SERIAL_MODELS,
  formatSerial,
  nextModelId,
  parseStickerRows,
  planSeries,
  serialPrefix,
  validateStickerRequest,
} from '@/lib/serialgen';
import { DEFAULT_COLORS } from '@/lib/productCodes';

const olive = { modelId: 'P01', gender: 'M' as const, colorCode: '01', colorName: 'Olive Green', size: 'M', quantity: 20 };

describe('sticker serials', () => {
  it('builds the serial in the documented order', () => {
    expect(serialPrefix(olive)).toBe('WCP01M0103');
    expect(formatSerial('WCP01M0103', 1)).toBe('WCP01M0103000001');
    expect(serialPrefix({ ...olive, gender: 'W', colorCode: '02', size: 'XL' })).toBe('WCP01W0205');
    expect(serialPrefix({ ...olive, size: 'XXXXL' })).toBeNull();
  });

  it('carries on from the last number printed for the variant', () => {
    const { series, last } = planSeries([olive, { ...olive, size: 'L' }, olive], { WCP01M0103: 20 });
    expect(series.map((s) => [s.prefix, s.start, s.end])).toEqual([
      ['WCP01M0103', 21, 40],
      ['WCP01M0104', 1, 20],
      ['WCP01M0103', 41, 60],
    ]);
    expect(last).toEqual({ WCP01M0103: 60, WCP01M0104: 20 });
  });

  it('refuses to pass 999999', () => {
    expect(() => planSeries([olive], { WCP01M0103: 999_990 })).toThrow();
  });

  it('validates a request against the lists', () => {
    const codes = DEFAULT_COLORS.map((c) => c.code);
    expect(validateStickerRequest(olive, DEFAULT_SERIAL_MODELS, codes)).toBeNull();
    expect(validateStickerRequest({ ...olive, modelId: 'P09' }, DEFAULT_SERIAL_MODELS, codes)).toMatch(/product/);
    expect(validateStickerRequest({ ...olive, colorCode: '07' }, DEFAULT_SERIAL_MODELS, codes)).toMatch(/colour/);
    expect(validateStickerRequest({ ...olive, quantity: 0 }, DEFAULT_SERIAL_MODELS, codes)).toMatch(/Quantity/);
  });

  it('numbers new models after the highest one', () => {
    expect(nextModelId(DEFAULT_SERIAL_MODELS)).toBe('P02');
  });

  it('reads spreadsheet rows with names or codes', () => {
    const { requests, errors } = parseStickerRows(
      [
        { 'Product ID': 'p01', Color: 'Deep Blue', Gender: 'Women', Size: 's', Quantity: 20 },
        { 'product id': 'P01', color: '1', gender: 'M', size: 'XXL', quantity: '5' },
        { 'Product ID': '', Color: '', Gender: '', Size: '', Quantity: '' },
        { 'Product ID': 'P01', Color: 'Pink', Gender: 'Men', Size: 'M', Quantity: 3 },
      ],
      DEFAULT_SERIAL_MODELS,
      DEFAULT_COLORS
    );
    expect(requests).toEqual([
      { modelId: 'P01', gender: 'W', colorCode: '02', colorName: 'Deep Blue', size: 'S', quantity: 20 },
      { modelId: 'P01', gender: 'M', colorCode: '01', colorName: 'Olive Green', size: '2XL', quantity: 5 },
    ]);
    expect(errors).toEqual(['Row 5: Unknown colour "Pink".']);
  });
});
