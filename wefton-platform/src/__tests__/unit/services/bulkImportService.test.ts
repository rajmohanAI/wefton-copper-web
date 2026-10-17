// ============================================================
// Wefton Copper — Bulk product import (variant rows → products)
// ============================================================
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ getFirebaseDb: () => null, getFirebaseAuth: () => null }));

import { validateProductRows, type ParsedRow } from '@/services/bulkImportService';
import { buildTemplateCsv } from '@/lib/bulkImportTemplates';
import { DEFAULT_COLORS } from '@/lib/productCodes';
import Papa from 'papaparse';

function csvRows(csv: string): ParsedRow[] {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  return parsed.data.map((data, i) => ({ rowNumber: i + 1, data }));
}

describe('validateProductRows', () => {
  it('turns the sample CSV into one product per gender with all variants', async () => {
    const outcome = await validateProductRows(csvRows(buildTemplateCsv('create-products')), [], DEFAULT_COLORS);
    expect(outcome.errors).toBe(0);
    expect(outcome.createPlan).toHaveLength(2);
    const men = outcome.createPlan.find((p) => p.data.gender === 'men')!;
    expect(men.data.slug).toBe('crew-neck-t-shirt-men');
    expect(men.data.variants).toHaveLength(6);
    expect(men.data.inventory).toBe(120);
    expect(men.data.shortDescription).toBe('Premium lightweight cotton crew neck T-shirt.');
    expect(men.data.tags).toEqual(['cotton', 'crew neck', 'essentials']);
    const olive = men.data.variants.find((v) => v.color === 'Olive Green' && v.size === 'M')!;
    expect(men.colorCodes[olive.variantId]).toBe('01');
  });

  it('flags unknown colours and sizes', async () => {
    const rows: ParsedRow[] = [
      { rowNumber: 1, data: { title: 'Tee', gender: 'men', category: 'premium-tee', price: '500', inventory: '3', color: 'Purple', size: 'M' } },
      { rowNumber: 2, data: { title: 'Tee', gender: 'men', category: 'premium-tee', price: '500', inventory: '3', color: 'Deep Blue', size: '7XL' } },
    ];
    const outcome = await validateProductRows(rows, [], DEFAULT_COLORS);
    expect(outcome.errors).toBe(2);
    expect(outcome.createPlan).toHaveLength(0);
  });

  it('adds the gender to slugs when men and women share a title', async () => {
    const base = { title: 'Polo', category: 'premium-tee', price: '900', inventory: '1', color: 'Deep Blue', size: 'M' };
    const outcome = await validateProductRows(
      [
        { rowNumber: 1, data: { ...base, gender: 'men' } },
        { rowNumber: 2, data: { ...base, gender: 'women' } },
      ],
      [],
      DEFAULT_COLORS
    );
    expect(outcome.createPlan.map((p) => p.data.slug).sort()).toEqual(['polo-men', 'polo-women']);
  });
});
