'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { getFirebaseAuth } from '@/lib/firebase';
import { SUPPORT_STATUSES, type SupportRequest } from '@/lib/support';
import { RETURN_OUTCOMES, labelFor } from '@/lib/wheez';
import { topicLabel as contactTopicLabel, type ContactTopic } from '@/lib/contact';

// ============================================================
// Admin → Support: Contact Us messages and Wheez requests (WC-Issue-13)
// ============================================================

type Filter = 'all' | 'return' | 'complaint' | 'suggestion' | 'report' | 'contact';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'return', label: 'Returns' },
  { value: 'complaint', label: 'Complaints' },
  { value: 'suggestion', label: 'Suggestions' },
  { value: 'report', label: 'Error reports' },
  { value: 'contact', label: 'Contact form' },
];

const TYPE_LABELS: Record<string, string> = {
  return: 'Return',
  complaint: 'Complaint',
  suggestion: 'Suggestion',
  report: 'Error report',
};

async function token(): Promise<string> {
  return (await getFirebaseAuth()?.currentUser?.getIdToken()) || '';
}

function kind(r: SupportRequest): Filter {
  return r.source === 'wheez' && r.type ? (r.type as Filter) : 'contact';
}

function RequestPhoto({ path }: { path: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let url = '';
    (async () => {
      const res = await fetch(`/api/admin/support/image?path=${encodeURIComponent(path)}`, {
        headers: { Authorization: `Bearer ${await token()}` },
      });
      if (res.ok) {
        url = URL.createObjectURL(await res.blob());
        setSrc(url);
      }
    })();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);
  if (!src) return <div className="h-24 w-24 rounded bg-white/5" />;
  return (
    <a href={src} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Customer photo" className="h-24 w-24 rounded object-cover" />
    </a>
  );
}

export default function SupportTab() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/support', { headers: { Authorization: `Bearer ${await token()}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not load requests');
      setRequests(body.requests || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (r: SupportRequest, status: string) => {
    setSaving(r.id);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ id: r.id, status }),
      });
      if (!res.ok) throw new Error();
      setRequests((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: status as SupportRequest['status'] } : x)));
    } catch {
      setError('Could not update the status');
    } finally {
      setSaving(null);
    }
  };

  const shown = requests.filter((r) => filter === 'all' || kind(r) === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded px-3 py-1.5 text-xs ${
                filter === f.value
                  ? 'bg-[var(--copper-main)]/15 text-[var(--copper-light)] border border-[var(--copper-main)]/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-light)] border border-transparent'
              }`}
            >
              {f.label} ({f.value === 'all' ? requests.length : requests.filter((r) => kind(r) === f.value).length})
            </button>
          ))}
        </div>
        <button type="button" onClick={load} className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-light)]">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No requests yet.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((r) => {
            const open = openId === r.id;
            const k = kind(r);
            const topic = k === 'contact' ? contactTopicLabel(r.topic as ContactTopic) : r.topicLabel || r.topic;
            return (
              <li key={r.id} className="glass-card">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="w-full flex items-center gap-4 p-4 text-left"
                  aria-expanded={open}
                >
                  <span className="w-28 shrink-0 text-xs font-mono text-[var(--copper-light)]">
                    {r.source === 'wheez' ? r.requestId : 'Contact form'}
                  </span>
                  <span className="w-24 shrink-0 text-xs text-[var(--text-muted)]">{k === 'contact' ? 'Message' : TYPE_LABELS[k]}</span>
                  <span className="flex-1 min-w-0 truncate text-sm text-[var(--text-light)]">
                    {topic}
                    {r.orderId ? ` · ${r.orderId}` : ''}
                  </span>
                  <span className="hidden md:block text-xs text-[var(--text-faint)]">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{labelFor(SUPPORT_STATUSES, r.status || 'new')}</span>
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {open && (
                  <div className="px-4 pb-4 space-y-3 text-sm text-[var(--text-muted)]">
                    <p>
                      {r.name || 'No name'} · {r.email ? <a className="underline" href={`mailto:${r.email}`}>{r.email}</a> : 'no email'}
                      {r.phone ? ` · ${r.phone}` : ''}
                    </p>
                    {k === 'return' && (
                      <div className="space-y-1">
                        <p>Wants: {labelFor(RETURN_OUTCOMES, r.outcome || '')}</p>
                        <ul className="list-disc pl-5">
                          {(r.items || []).map((i, n) => (
                            <li key={n}>
                              {i.title} {[i.size, i.color].filter(Boolean).join(', ')} × {i.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.message && <p className="whitespace-pre-wrap text-[var(--text-light)]">{r.message}</p>}
                    {r.pageUrl && <p>Page: {r.pageUrl}</p>}
                    {!!r.images?.length && (
                      <div className="flex flex-wrap gap-2">
                        {r.images.map((p) => (
                          <RequestPhoto key={p} path={p} />
                        ))}
                      </div>
                    )}
                    <label className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-[var(--text-faint)]">Status</span>
                      <select
                        value={r.status || 'new'}
                        disabled={saving === r.id}
                        onChange={(e) => setStatus(r, e.target.value)}
                        className="rounded border border-[var(--border-subtle)] bg-[var(--bg-dark)] px-2 py-1 text-sm text-[var(--text-light)]"
                      >
                        {SUPPORT_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
