'use client';

import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { attributionForSave } from '@/lib/attribution';

type Status = 'idle' | 'saving' | 'done' | 'error';

/**
 * "Register your piece" (MRD-01): the owner ties this serial to their email.
 * Joining the monthly "Join our family" email is a separate, unticked choice.
 */
export default function RegisterPiece({ serial }: { serial: string }) {
  const [email, setEmail] = useState('');
  const [joinFamily, setJoinFamily] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    setMessage('');
    try {
      const res = await fetch('/api/register-piece', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, email: email.trim(), joinFamily, attribution: attributionForSave() ?? undefined }),
      });
      const body = (await res.json().catch(() => ({}))) as { result?: string; message?: string; error?: string };
      if (res.ok) {
        setStatus('done');
        setMessage(body.message || 'Thank you! This piece is now registered to you.');
      } else {
        setStatus('error');
        setMessage(body.message || body.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  if (status === 'done') {
    return (
      <section aria-label="Register your piece" className="glass-card p-4 sm:p-5">
        <p className="flex items-start gap-2 text-sm text-emerald-500">
          <CheckCircle size={18} className="mt-0.5 flex-shrink-0" /> {message}
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Register your piece" className="glass-card p-4 sm:p-5 space-y-3">
      <div>
        <h2 className="text-base font-medium text-[var(--text-light)]">Register your piece</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Keep a record of this piece with us, so we can help quickly if you ever need us.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            aria-label="Email address"
            disabled={status === 'saving'}
            className="flex-1 min-w-0 h-10 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-light)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--copper-main)]"
          />
          <button
            type="submit"
            disabled={status === 'saving' || !email.trim()}
            className="h-10 px-4 rounded bg-[var(--copper-main)] text-white text-xs tracking-widest uppercase hover:bg-[var(--copper-light)] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {status === 'saving' && <Loader2 size={14} className="animate-spin" />}
            Register
          </button>
        </div>
        <label className="flex items-start gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={joinFamily}
            onChange={(e) => setJoinFamily(e.target.checked)}
            className="mt-0.5 accent-[var(--copper-main)]"
          />
          <span>Also send me the monthly &ldquo;Join our family&rdquo; email (new arrivals and stories). I can unsubscribe anytime.</span>
        </label>
        {status === 'error' && message && (
          <p className="text-xs text-red-400" role="alert">
            {message}
          </p>
        )}
        <p className="text-[11px] text-[var(--text-faint)]">
          We use your email only for this piece and, if you tick the box, the monthly email. See our{' '}
          <a href="/privacy" className="underline underline-offset-2">Privacy Policy</a>.
        </p>
      </form>
    </section>
  );
}
