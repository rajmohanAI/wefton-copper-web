'use client';

import { useEffect, useState } from 'react';
import { formatSerial, type SerialLogEntry } from '@/lib/serialgen';
import { fetchSerialLog } from '@/services/serialgenService';

const GENDER_LABEL: Record<SerialLogEntry['gender'], string> = { M: 'Men', W: 'Women', U: 'Unisex' };

/** The changelog of generated serials, newest first. */
export default function SerialHistory({ refreshKey }: { refreshKey: number }) {
  const [entries, setEntries] = useState<SerialLogEntry[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchSerialLog()
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the history.');
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!entries) return <p className="text-sm text-[var(--text-muted)]">Loading history…</p>;
  if (!entries.length) {
    return <p className="glass-card p-6 text-xs text-[var(--text-muted)]">Nothing has been logged yet. PDFs generated from now on appear here.</p>;
  }

  return (
    <div className="glass-card overflow-x-auto max-h-96 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="text-[var(--text-muted)] text-left">
          <tr>
            <th className="p-2 font-medium">When</th>
            <th className="p-2 font-medium">Serials</th>
            <th className="p-2 font-medium">Product</th>
            <th className="p-2 font-medium">Color</th>
            <th className="p-2 font-medium">Gender</th>
            <th className="p-2 font-medium">Size</th>
            <th className="p-2 font-medium text-right">Qty</th>
            <th className="p-2 font-medium">By</th>
            <th className="p-2 font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-t border-white/5 text-[var(--text-light)]">
              <td className="p-2 whitespace-nowrap">{e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}</td>
              <td className="p-2 font-mono whitespace-nowrap">
                {formatSerial(e.prefix, e.start)} – {String(e.end).padStart(6, '0')}
              </td>
              <td className="p-2">{e.modelId}</td>
              <td className="p-2 whitespace-nowrap">{e.colorName}</td>
              <td className="p-2">{GENDER_LABEL[e.gender]}</td>
              <td className="p-2">{e.size}</td>
              <td className="p-2 text-right">{e.quantity}</td>
              <td className="p-2 whitespace-nowrap">{e.by}</td>
              <td className="p-2 whitespace-nowrap">
                {[e.reprint && 'Reprint', e.status === 'failed' && 'PDF failed', e.source === 'excel' && 'Excel'].filter(Boolean).join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
