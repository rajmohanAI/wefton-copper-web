import { unitLabel } from '@/lib/sizeChart';
import type { SizeChart } from '@/types';

interface SizeChartTableProps {
  chart: SizeChart;
  title: string;
  /** Sizes currently in stock; others are shown dimmed. Undefined = no stock info. */
  inStock?: Set<string>;
}

export default function SizeChartTable({ chart, title, inStock }: SizeChartTableProps) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-medium text-[var(--text-light)] mb-1">{title}</h2>
      <p className="text-xs text-[var(--text-faint)] mb-5">Garment measurements in {unitLabel(chart.unit)}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-[var(--text-muted)] border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="text-left py-3 pr-4 text-[var(--text-light)] font-medium">Size</th>
              {chart.measurements.map((m) => (
                <th key={m} className="text-center py-3 px-4 font-medium">
                  {m} ({chart.unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row) => {
              const out = inStock && !inStock.has(row.size);
              return (
                <tr key={row.size} className={`border-b border-[var(--border-subtle)] ${out ? 'opacity-50' : ''}`}>
                  <td className="py-3 pr-4 font-medium text-[var(--copper-light)] whitespace-nowrap">
                    {row.size}
                    {out && <span className="ml-2 text-[0.6875rem] font-normal text-[var(--text-faint)]">out of stock</span>}
                  </td>
                  {row.values.map((v, i) => (
                    <td key={i} className="py-3 px-4 text-center">
                      {v ?? '–'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
