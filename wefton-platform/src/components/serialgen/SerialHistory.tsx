'use client';

import { useEffect, useState } from 'react';
import { formatSerial, type SerialLogEntry } from '@/lib/serialgen';
import { clearSerialLog, fetchSerialLog } from '@/services/serialgenService';

const GENDER_LABEL: Record<SerialLogEntry['gender'], string> = {
  M: 'Men',
  W: 'Women',
  U: 'Unisex',
};

/** The changelog of generated serials, newest first. */
export default function SerialHistory({ refreshKey }: { refreshKey: number }) {
  const [entries, setEntries] = useState<SerialLogEntry[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState('');

  const clear = async () => {
    setClearing(true);
    setError('');
    try {
      const n = await clearSerialLog();
      setNotice(`History cleared. ${n} line${n === 1 ? '' : 's'} moved to the archive; serials restart at 000001.`);
      setConfirming(false);
      setReload((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not clear the history.');
    } finally {
      setClearing(false);
    }
  };

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
  }, [refreshKey, reload]);

  if (error && !entries) return <p className="text-sm text-red-400">{error}</p>;
  if (!entries) return <p className="text-sm text-[var(--text-muted)]">Loading history…</p>;
  if (!entries.length) {
    return (
      <div className="space-y-2">
        {notice && <p className="text-xs text-emerald-500">{notice}</p>}
        <p className="glass-card p-6 text-xs text-[var(--text-muted)]">
          Nothing has been logged yet. PDFs generated from now on appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
        {error && <span className="mr-auto text-red-400">{error}</span>}
        {confirming ? (
          <>
            <span className="text-[var(--text-muted)]">
              Move all {entries.length} lines to the archive and restart every variant at 000001? Old serials still check as genuine.
            </span>
            <button
              type="button"
              onClick={clear}
              disabled={clearing}
              className="px-3 py-1.5 rounded border border-red-400/60 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              {clearing ? 'Clearing…' : 'Clear history'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={clearing}
              className="px-3 py-1.5 rounded border border-white/10 text-[var(--text-muted)] hover:text-[var(--text-light)]"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setNotice('');
              setConfirming(true);
            }}
            className="px-3 py-1.5 rounded border border-white/10 text-[var(--text-muted)] hover:text-[var(--text-light)]"
          >
            Start fresh (restart at 000001)
          </button>
        )}
      </div>
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
                  {[e.reprint && 'Reprint', e.status === 'failed' && 'PDF failed', e.source === 'excel' && 'Excel']
                    .filter(Boolean)
                    .join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
