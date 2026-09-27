'use client';

import { useState } from 'react';
import { CheckCircle2, SkipForward, AlertCircle } from 'lucide-react';
import type { ValidationOutcome, RowStatus } from '@/services/bulkImportService';

interface Props {
  outcome: ValidationOutcome;
}

const TABS: { key: RowStatus; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { key: 'applicable', label: 'Applicable', icon: CheckCircle2, color: 'text-emerald-400' },
  { key: 'skipped', label: 'Skipped', icon: SkipForward, color: 'text-amber-400' },
  { key: 'error', label: 'Errors', icon: AlertCircle, color: 'text-red-400' },
];

export default function ImportPreviewTable({ outcome }: Props) {
  const [tab, setTab] = useState<RowStatus>(outcome.errors > 0 ? 'error' : 'applicable');
  const counts: Record<RowStatus, number> = {
    applicable: outcome.applicable,
    skipped: outcome.skipped,
    error: outcome.errors,
  };
  const rows = outcome.results.filter((r) => r.status === tab);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {TABS.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors ${
              tab === key
                ? 'border-[var(--copper-main)] bg-white/5 text-[var(--text-light)]'
                : 'border-white/10 text-[var(--text-muted)] hover:text-[var(--text-light)]'
            }`}
          >
            <Icon size={13} className={color} />
            {label}
            <span className="ml-1 text-[var(--text-faint)]">({counts[key]})</span>
          </button>
        ))}
      </div>

      <div className="bg-black/30 border border-white/10 rounded-lg max-h-[40vh] overflow-y-auto">
        {rows.length === 0 ? (
          <p className="p-4 text-xs text-[var(--text-faint)] italic">No {tab} rows.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--bg-card)]">
              <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-3 py-2 w-16">Row</th>
                <th className="px-3 py-2 w-1/3">Item</th>
                <th className="px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.status}-${r.rowNumber}-${r.label ?? ''}`} className="border-t border-white/5">
                  <td className="px-3 py-2 text-[var(--text-faint)]">{r.rowNumber || '—'}</td>
                  <td className="px-3 py-2 text-[var(--text-light)] truncate">{r.label || '—'}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{r.message || (r.status === 'applicable' ? 'Will be applied' : '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
