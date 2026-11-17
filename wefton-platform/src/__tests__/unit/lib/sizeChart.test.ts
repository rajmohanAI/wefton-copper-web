import { describe, expect, it } from 'vitest';
import {
  STANDARD_MEN_CHART,
  STANDARD_WOMEN_CHART,
  chartForProduct,
  parseSizeChartCsv,
  sizeChartToCsv,
} from '@/lib/sizeChart';

describe('standard charts', () => {
  it('match the reference sheet', () => {
    expect(STANDARD_MEN_CHART.rows.map((r) => [r.size, ...r.values])).toEqual([
      ['M', 40, 16.5, 27],
      ['L', 42, 17.5, 27.5],
      ['XL', 44, 18.5, 28.5],
    ]);
    expect(STANDARD_WOMEN_CHART.measurements[0]).toBe('Bust');
    expect(STANDARD_WOMEN_CHART.rows.map((r) => r.size)).toEqual(['S', 'M', 'L']);
  });
  it('fall back by gender when a product has no chart', () => {
    expect(chartForProduct({ gender: 'women' })).toBe(STANDARD_WOMEN_CHART);
    expect(chartForProduct({ gender: 'unisex' })).toBe(STANDARD_MEN_CHART);
    const own = { unit: 'cm' as const, measurements: ['Chest'], rows: [{ size: 'S', values: [90] }] };
    expect(chartForProduct({ gender: 'men', sizeChart: own })).toBe(own);
  });
});

describe('parseSizeChartCsv', () => {
  it('round-trips the template', () => {
    const r = parseSizeChartCsv(sizeChartToCsv(STANDARD_MEN_CHART));
    expect(r).toEqual({ ok: true, value: STANDARD_MEN_CHART });
  });
  it('reads cm, normalises XXL and sorts sizes', () => {
    const r = parseSizeChartCsv('﻿Unit,cm\r\nSize,Chest\r\nxxl,120\r\nS,90\r\n');
    expect(r.ok && r.value).toEqual({
      unit: 'cm',
      measurements: ['Chest'],
      rows: [
        { size: 'S', values: [90] },
        { size: '2XL', values: [120] },
      ],
    });
  });
  it('defaults to inches and allows blank cells', () => {
    const r = parseSizeChartCsv('Size,Chest,Length\nM,40,\n');
    expect(r.ok && r.value.unit).toBe('in');
    expect(r.ok && r.value.rows[0].values).toEqual([40, null]);
  });
  it('explains bad files', () => {
    expect(parseSizeChartCsv('')).toMatchObject({ ok: false });
    expect(parseSizeChartCsv('Unit,ft\nSize,Chest\nM,1')).toMatchObject({ ok: false, error: expect.stringContaining('Unit') });
    expect(parseSizeChartCsv('Chest,Length\n40,27')).toMatchObject({ ok: false, error: expect.stringContaining('Size') });
    expect(parseSizeChartCsv('Size,Chest\nM,forty')).toMatchObject({ ok: false, error: expect.stringContaining('forty') });
    expect(parseSizeChartCsv('Size,Chest\nM,40\nM,41')).toMatchObject({ ok: false, error: expect.stringContaining('twice') });
    expect(parseSizeChartCsv('Size,Chest\n')).toMatchObject({ ok: false });
  });
});
