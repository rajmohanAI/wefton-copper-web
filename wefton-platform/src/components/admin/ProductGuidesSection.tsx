'use client';

import { useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { parseSizeChartCsv, sizeChartToCsv, standardChart, unitLabel } from '@/lib/sizeChart';
import { parseWashCareText, washCareToText } from '@/lib/washCareDoc';
import { STANDARD_COTTON_TEE_GUIDE, type WashCareGuide } from '@/config/washCare';
import type { Product, SizeChart } from '@/types';

const SECTION = 'text-sm font-semibold text-[var(--text-light)] tracking-wider uppercase';
const BUTTON =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded border border-[var(--wc-line)] text-xs text-[var(--text-light)] hover:border-[var(--copper-main)] transition-colors cursor-pointer';

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  gender: Product['gender'];
  sizeChart: SizeChart | null;
  onSizeChart: (chart: SizeChart | null) => void;
  careGuide: WashCareGuide | null;
  onCareGuide: (guide: WashCareGuide | null) => void;
}

/**
 * Size chart (WC-Issue-7) and wash care (WC-Issue-11) uploads on the product
 * form. Admins download the standard file, edit it and upload it for a new
 * product; products without an upload use the standard chart and guide.
 */
export default function ProductGuidesSection({ gender, sizeChart, onSizeChart, careGuide, onCareGuide }: Props) {
  const [chartError, setChartError] = useState('');
  const [careError, setCareError] = useState('');

  const readFile = (onText: (text: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 100_000) {
      onText('\u0000too-large');
      return;
    }
    file.text().then(onText);
  };

  const onChartText = (text: string) => {
    if (text === '\u0000too-large') return setChartError('That file is too large for a size chart.');
    const r = parseSizeChartCsv(text);
    if (r.ok) {
      setChartError('');
      onSizeChart(r.value);
    } else setChartError(r.error);
  };
  const onCareText = (text: string) => {
    if (text === '\u0000too-large') return setCareError('That file is too large for a wash care guide.');
    const r = parseWashCareText(text);
    if (r.ok) {
      setCareError('');
      onCareGuide(r.value);
    } else setCareError(r.error);
  };

  const chartShown = sizeChart ?? standardChart(gender);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className={SECTION}>Size Chart</h3>
        <p className="text-xs text-[var(--text-muted)]">
          For a new product, download the standard chart, change the sizes and measurements, and
          upload it as CSV. Without an upload, the product uses the standard Crew Neck chart for its
          gender. The Size Guide page shows this chart when a customer picks the product.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={BUTTON}
            onClick={() => download(`size-chart-${gender}.csv`, sizeChartToCsv(chartShown), 'text/csv')}
          >
            <Download size={13} /> Download {sizeChart ? 'this' : 'standard'} chart
          </button>
          <label className={BUTTON}>
            <Upload size={13} /> Upload chart (.csv)
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={readFile(onChartText)} />
          </label>
          {sizeChart && (
            <button type="button" className={BUTTON} onClick={() => onSizeChart(null)}>
              <X size={13} /> Use standard chart
            </button>
          )}
        </div>
        {chartError && <p className="text-xs text-red-700 dark:text-red-300">{chartError}</p>}
        <div className="overflow-x-auto rounded border border-[var(--wc-line)]">
          <table className="w-full text-xs text-[var(--text-muted)]">
            <caption className="text-left px-3 pt-2 text-[var(--text-faint)]">
              {sizeChart ? 'Uploaded chart' : 'Standard chart'} · {unitLabel(chartShown.unit)}
            </caption>
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-[var(--text-light)]">Size</th>
                {chartShown.measurements.map((m) => (
                  <th key={m} className="px-3 py-2">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartShown.rows.map((r) => (
                <tr key={r.size} className="border-t border-[var(--wc-line)]">
                  <td className="px-3 py-1.5 text-[var(--text-light)]">{r.size}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className="px-3 py-1.5 text-center">
                      {v ?? '–'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className={SECTION}>Wash Care</h3>
        <p className="text-xs text-[var(--text-muted)]">
          For a new product, download the standard wash care document, edit it, and upload it as a
          .txt file. Lines start with &ldquo;# &rdquo; for a heading and &ldquo;- &rdquo; for an
          instruction. Without an upload, the product uses the standard cotton T-shirt guide.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={BUTTON}
            onClick={() =>
              download('wash-care.txt', washCareToText(careGuide ?? STANDARD_COTTON_TEE_GUIDE), 'text/plain')
            }
          >
            <Download size={13} /> Download {careGuide ? 'this' : 'standard'} guide
          </button>
          <label className={BUTTON}>
            <Upload size={13} /> Upload guide (.txt)
            <input type="file" accept=".txt,text/plain" className="sr-only" onChange={readFile(onCareText)} />
          </label>
          {careGuide && (
            <button type="button" className={BUTTON} onClick={() => onCareGuide(null)}>
              <X size={13} /> Use standard guide
            </button>
          )}
        </div>
        {careError && <p className="text-xs text-red-700 dark:text-red-300">{careError}</p>}
        <p className="text-xs text-[var(--text-faint)]">
          Current: {careGuide ? `uploaded guide “${careGuide.name}”` : `standard guide “${STANDARD_COTTON_TEE_GUIDE.name}”`}
          {careGuide && ` · ${careGuide.sections.length} sections`}
        </p>
      </div>
    </div>
  );
}
