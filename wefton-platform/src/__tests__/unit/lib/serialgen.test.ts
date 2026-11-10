// ============================================================
// Wefton Copper — Product sticker serials
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SERIAL_MODELS,
  findSerialConflicts,
  formatSerial,
  mergeRanges,
  nextModelId,
  parseSerial,
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

  it('starts from a chosen number without moving the counter backwards', () => {
    const { series, last } = planSeries([{ ...olive, start: 5 }, olive], { WCP01M0103: 40 });
    expect(series.map((s) => [s.start, s.end])).toEqual([[5, 24], [41, 60]]);
    expect(last).toEqual({ WCP01M0103: 60 });
  });

  it('joins printed ranges that overlap or touch', () => {
    expect(mergeRanges([{ s: 21, e: 40 }, { s: 1, e: 20 }, { s: 60, e: 70 }, { s: 65, e: 80 }])).toEqual([
      { s: 1, e: 40 },
      { s: 60, e: 80 },
    ]);
  });

  it('finds serials already generated', () => {
    const ranges = { WCP01M0103: [{ s: 1, e: 20 }, { s: 50, e: 60 }] };
    const last = { WCP01M0103: 60 };
    const line = (start: number, end: number) => ({ prefix: 'WCP01M0103', start, end });
    expect(findSerialConflicts([line(21, 40)], ranges, last)).toEqual([]);
    expect(findSerialConflicts([line(15, 30)], ranges, last)).toEqual([
      { line: 0, prefix: 'WCP01M0103', start: 15, end: 30, overlapStart: 15, overlapEnd: 20, nextStart: 61 },
    ]);
  });

  it('treats batches from before ranges were kept as 1 to last', () => {
    const conflicts = findSerialConflicts([{ prefix: 'WCP01M0103', start: 3, end: 4 }], {}, { WCP01M0103: 20 });
    expect(conflicts[0]).toMatchObject({ overlapStart: 3, overlapEnd: 4, nextStart: 21 });
  });

  it('finds lines that repeat each other in one batch', () => {
    const conflicts = findSerialConflicts(
      [
        { prefix: 'WCP01M0103', start: 1, end: 20 },
        { prefix: 'WCP01M0103', start: 10, end: 12 },
      ],
      {},
      {}
    );
    expect(conflicts).toEqual([
      { line: 1, prefix: 'WCP01M0103', start: 10, end: 12, overlapStart: 10, overlapEnd: 12, nextStart: 21 },
    ]);
  });

  it('does not treat the same numbers on another variant as a repeat', () => {
    expect(findSerialConflicts([{ prefix: 'WCP01M0104', start: 1, end: 20 }], { WCP01M0103: [{ s: 1, e: 20 }] }, { WCP01M0103: 20 })).toEqual([]);
  });

  it('reads a serial back into its parts', () => {
    expect(parseSerial(' wcp01-w0205 000020 ')).toEqual({
      serial: 'WCP01W0205000020',
      prefix: 'WCP01W0205',
      piece: 20,
      modelId: 'P01',
      gender: 'W',
      colorCode: '02',
      size: 'XL',
    });
    expect(parseSerial('WCP01M0111000001')).toBeNull(); // no size 11
    expect(parseSerial('WCP01M0103000000')).toBeNull();
    expect(parseSerial('WCP01M010300001')).toBeNull();
    expect(parseSerial('hello')).toBeNull();
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
    expect(validateStickerRequest({ ...olive, start: 0 }, DEFAULT_SERIAL_MODELS, codes)).toMatch(/Start/);
    expect(validateStickerRequest({ ...olive, start: 21 }, DEFAULT_SERIAL_MODELS, codes)).toBeNull();
  });

  it('numbers new models after the highest one', () => {
    expect(nextModelId(DEFAULT_SERIAL_MODELS)).toBe('P02');
  });

  it('reads spreadsheet rows with names or codes', () => {
    const { requests, errors } = parseStickerRows(
      [
        { 'Product ID': 'p01', Color: 'Deep Blue', Gender: 'Women', Size: 's', Quantity: 20 },
        { 'product id': 'P01', color: '1', gender: 'M', size: 'XXL', quantity: '5', start: 21 },
        { 'Product ID': '', Color: '', Gender: '', Size: '', Quantity: '' },
        { 'Product ID': 'P01', Color: 'Pink', Gender: 'Men', Size: 'M', Quantity: 3 },
      ],
      DEFAULT_SERIAL_MODELS,
      DEFAULT_COLORS
    );
    expect(requests).toEqual([
      { modelId: 'P01', gender: 'W', colorCode: '02', colorName: 'Deep Blue', size: 'S', quantity: 20 },
      { modelId: 'P01', gender: 'M', colorCode: '01', colorName: 'Olive Green', size: '2XL', quantity: 5, start: 21 },
    ]);
    expect(errors).toEqual(['Row 5: Unknown colour "Pink".']);
  });
});
