// ============================================================
// Wefton Copper — product size charts (WC-Issue-7)
// ============================================================
// Each product can carry its own size chart (uploaded by an admin as a
// CSV). Products without one fall back to the standard chart for their
// gender, so the Size Guide always has something to show.
import { normalizeSize, CATALOG_SIZES } from '@/lib/productCodes';
import type { Product, SizeChart } from '@/types';

/** Standard Crew Neck chart, men (inches), from the Size_Guide_ref sheet. */
export const STANDARD_MEN_CHART: SizeChart = {
  unit: 'in',
  measurements: ['Chest', 'Shoulder', 'Length'],
  rows: [
    { size: 'M', values: [40, 16.5, 27] },
    { size: 'L', values: [42, 17.5, 27.5] },
    { size: 'XL', values: [44, 18.5, 28.5] },
  ],
};

/** Standard Crew Neck chart, women (inches), from the Size_Guide_ref sheet. */
export const STANDARD_WOMEN_CHART: SizeChart = {
  unit: 'in',
  measurements: ['Bust', 'Shoulder', 'Length'],
  rows: [
    { size: 'S', values: [34, 12, 24.5] },
    { size: 'M', values: [36, 13, 25.5] },
    { size: 'L', values: [38, 14, 26.5] },
  ],
};

export function standardChart(gender: Product['gender']): SizeChart {
  return gender === 'women' ? STANDARD_WOMEN_CHART : STANDARD_MEN_CHART;
}

/** The chart to show for a product: its own, else the standard one. */
export function chartForProduct(product: Pick<Product, 'gender' | 'sizeChart'>): SizeChart {
  return product.sizeChart?.rows?.length ? product.sizeChart : standardChart(product.gender);
}

const UNIT_LABEL: Record<SizeChart['unit'], string> = { in: 'inches', cm: 'centimetres' };
export const unitLabel = (unit: SizeChart['unit']) => UNIT_LABEL[unit];

/** CSV template an admin downloads, fills in and uploads. */
export function sizeChartToCsv(chart: SizeChart): string {
  return [
    `Unit,${chart.unit}`,
    ['Size', ...chart.measurements].join(','),
    ...chart.rows.map((r) => [r.size, ...r.values.map((v) => (v == null ? '' : String(v)))].join(',')),
  ].join('\n') + '\n';
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function splitCsvLine(line: string): string[] {
  return line.split(',').map((c) => c.trim().replace(/^"(.*)"$/, '$1').trim());
}

/**
 * Parse an uploaded size chart CSV:
 *   Unit,in            (optional; "in" or "cm", default "in")
 *   Size,Chest,Shoulder,Length
 *   M,40,16.5,27
 */
export function parseSizeChartCsv(text: string): ParseResult<SizeChart> {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^,*$/.test(l));
  if (!lines.length) return { ok: false, error: 'The file is empty.' };

  let unit: SizeChart['unit'] = 'in';
  const first = splitCsvLine(lines[0]);
  if (first[0].toLowerCase() === 'unit') {
    const u = (first[1] || '').toLowerCase();
    if (u === 'in' || u === 'inch' || u === 'inches') unit = 'in';
    else if (u === 'cm' || u === 'centimetres' || u === 'centimeters') unit = 'cm';
    else return { ok: false, error: `Unit must be "in" or "cm", not "${first[1] || ''}".` };
    lines.shift();
  }

  if (!lines.length) return { ok: false, error: 'The header row (Size, …) is missing.' };
  const header = splitCsvLine(lines[0]);
  if (header[0].toLowerCase() !== 'size') {
    return { ok: false, error: 'The header row must start with "Size".' };
  }
  const measurements = header.slice(1).filter(Boolean);
  if (!measurements.length) return { ok: false, error: 'Add at least one measurement column, e.g. Chest.' };
  if (measurements.length > 8) return { ok: false, error: 'Use at most 8 measurement columns.' };

  const rows: SizeChart['rows'] = [];
  const seen = new Set<string>();
  for (const [i, line] of lines.slice(1).entries()) {
    const cells = splitCsvLine(line);
    const size = normalizeSize(cells[0]);
    const rowNo = i + 2 + (first[0].toLowerCase() === 'unit' ? 1 : 0);
    if (!size) return { ok: false, error: `Row ${rowNo}: the size is missing.` };
    if (seen.has(size)) return { ok: false, error: `Row ${rowNo}: size ${size} appears twice.` };
    seen.add(size);
    const values: (number | null)[] = [];
    for (let c = 0; c < measurements.length; c++) {
      const raw = cells[c + 1] ?? '';
      if (raw === '') {
        values.push(null);
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) {
        return { ok: false, error: `Row ${rowNo}: "${raw}" under ${measurements[c]} is not a positive number.` };
      }
      values.push(n);
    }
    rows.push({ size, values });
  }
  if (!rows.length) return { ok: false, error: 'Add at least one size row.' };

  // Keep the usual size order (XS, S, M … 6XL); unknown sizes go last.
  const order = (s: string) => {
    const i = CATALOG_SIZES.indexOf(s);
    return i === -1 ? CATALOG_SIZES.length : i;
  };
  rows.sort((a, b) => order(a.size) - order(b.size));
  return { ok: true, value: { unit, measurements, rows } };
}
