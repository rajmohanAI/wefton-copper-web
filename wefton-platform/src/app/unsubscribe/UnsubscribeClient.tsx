'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function UnsubscribeClient({ token, email }: { token: string; email: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const confirm = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="space-y-4">
        <p className="flex items-center justify-center gap-2 text-sm text-emerald-400">
          <CheckCircle size={16} /> You&apos;ve been unsubscribed.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          We&apos;re sorry to see you go. You can join again anytime from the bottom of any page.
        </p>
        <Link href="/" className="inline-block text-xs text-[var(--copper-light)] underline">
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Stop the monthly Wefton Copper emails to <span className="text-[var(--text-light)]">{email}</span>?
      </p>
      <button
        type="button"
        onClick={confirm}
        disabled={status === 'loading'}
        className="h-10 px-6 bg-[var(--copper-main)] text-white text-xs tracking-widest uppercase rounded hover:bg-[var(--copper-light)] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
      >
        {status === 'loading' && <Loader2 size={14} className="animate-spin" />}
        Unsubscribe
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-400" role="alert">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
