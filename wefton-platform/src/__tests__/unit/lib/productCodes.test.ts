// ============================================================
// Wefton Copper — Product ID & SKU scheme
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  autoShortDescription,
  buildVariantSku,
  formatProductCode,
  nextColorCode,
  normalizeSize,
  parseProductCode,
  skuBase,
  DEFAULT_COLORS,
} from '@/lib/productCodes';

describe('product codes', () => {
  it('formats a per-gender Product ID', () => {
    expect(formatProductCode('men', 1)).toBe('WCPM001');
    expect(formatProductCode('women', 12)).toBe('WCPW012');
    expect(formatProductCode('unisex', 999)).toBe('WCPU999');
    expect(() => formatProductCode('men', 1000)).toThrow();
  });

  it('parses a Product ID back', () => {
    expect(parseProductCode('WCPW007')).toEqual({ letter: 'W', number: 7 });
    expect(parseProductCode('WCP01M')).toBeNull();
  });

  it('builds variant SKUs in the Table 1.1 order with a 2-digit model no', () => {
    expect(skuBase('WCPM001')).toBe('WCP01M');
    expect(skuBase('WCPM099')).toBe('WCP99M');
    expect(skuBase('WCPM100')).toBeNull();
    expect(buildVariantSku('WCPM001', '01', 'M')).toBe('WCP01M0103');
    expect(buildVariantSku('WCPW001', '02', 'S')).toBe('WCP01W0202');
    expect(buildVariantSku('WCPM001', '02', 'XL')).toBe('WCP01M0205');
    expect(buildVariantSku('WCPM001', '01', '6XL')).toBe('WCP01M0110');
    expect(buildVariantSku('WCPM001', undefined, 'M')).toBeNull();
    expect(buildVariantSku('WCPM001', '01', 'XXXXL')).toBeNull();
  });

  it('maps XXL onto the size table', () => {
    expect(normalizeSize('xxl')).toBe('2XL');
    expect(buildVariantSku('WCPM001', '01', 'XXL')).toBe('WCP01M0106');
  });

  it('numbers new colours after the highest one', () => {
    expect(nextColorCode(DEFAULT_COLORS)).toBe('03');
  });

  it('derives a short description', () => {
    expect(autoShortDescription('Soft cotton tee. Made in India.')).toBe('Soft cotton tee.');
    const long = 'word '.repeat(60);
    const short = autoShortDescription(long);
    expect(short.length).toBeLessThanOrEqual(161);
    expect(short.endsWith('…')).toBe(true);
  });
});
