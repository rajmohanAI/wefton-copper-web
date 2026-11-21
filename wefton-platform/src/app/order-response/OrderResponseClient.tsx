'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';
import type { OrderChoice } from '@/lib/orderResponse';
import type { OrderChoiceView } from '@/services/orderLifecycleServer';

const inr = (n: number | undefined) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

function placedOn(value: string | undefined): string {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    : '';
}

const button =
  'h-10 px-5 text-xs tracking-widest uppercase rounded transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2';

export default function OrderResponseClient({
  token,
  initial,
  suggested,
}: {
  token: string;
  initial: OrderChoiceView;
  suggested?: OrderChoice;
}) {
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState<OrderChoice | null>(null);
  const [error, setError] = useState('');

  const answer = async (choice: OrderChoice) => {
    setBusy(choice);
    setError('');
    try {
      const res = await fetch('/api/orders/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token, choice }),
      });
      const data = (await res.json().catch(() => ({}))) as OrderChoiceView & { error?: string };
      if (!res.ok) setError(data.error || 'Something went wrong. Please try again.');
      else setView(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const date = placedOn(view.placedAt);
  const backLink = (
    <Link href="/" className="inline-block text-xs text-[var(--copper-light)] underline">
      Back to the shop
    </Link>
  );

  if (view.state === 'cancelled') {
    return (
      <div className="space-y-4">
        <p className="flex items-center justify-center gap-2 text-sm text-emerald-400">
          <CheckCircle size={16} /> {view.cancelledByCustomer ? 'Your order has been cancelled.' : 'This order has been cancelled.'}
        </p>
        {view.paid && (
          <p className="text-sm text-[var(--text-muted)]">
            Your refund of {inr(view.total)} goes back to your original payment method within 5–10 business days. We&apos;ve
            emailed you the details.
          </p>
        )}
        <p className="text-xs text-[var(--text-muted)]">We&apos;re sorry we couldn&apos;t get it to you, and we hope to see you again.</p>
        {backLink}
      </div>
    );
  }

  if (view.state === 'shipped' || view.state === 'closed') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          {view.state === 'shipped'
            ? 'Good news: your order is already on its way, so it can no longer be cancelled here.'
            : 'This order has been delivered.'}{' '}
          If you need anything, write to us at sales@weftoncopper.com.
        </p>
        {backLink}
      </div>
    );
  }

  if (view.state === 'waiting') {
    return (
      <div className="space-y-4">
        <p className="flex items-center justify-center gap-2 text-sm text-emerald-400">
          <CheckCircle size={16} /> Thank you for your patience.
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          We&apos;re working on your order and will update you as soon as it&apos;s on its way. If you change your mind, you
          can still cancel it here until it ships.
        </p>
        <button
          type="button"
          onClick={() => answer('cancel')}
          disabled={busy !== null}
          className={`${button} border border-[var(--copper-main)] text-[var(--copper-light)] hover:bg-[var(--copper-main)] hover:text-white`}
        >
          {busy === 'cancel' && <Loader2 size={14} className="animate-spin" />}
          {view.paid ? 'Cancel and refund my order' : 'Cancel my order'}
        </button>
        {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        We&apos;re truly sorry your order{date ? `, placed on ${date},` : ''} hasn&apos;t reached you yet. Would you like to give us a
        little more time, or cancel it{view.paid ? ` for a full refund of ${inr(view.total)}` : ''}?
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={() => answer('wait')}
          disabled={busy !== null}
          className={`${button} ${suggested === 'cancel' ? 'border border-[var(--copper-main)] text-[var(--copper-light)]' : 'bg-[var(--copper-main)] text-white hover:bg-[var(--copper-light)]'}`}
        >
          {busy === 'wait' && <Loader2 size={14} className="animate-spin" />}
          I&apos;ll wait
        </button>
        <button
          type="button"
          onClick={() => answer('cancel')}
          disabled={busy !== null}
          className={`${button} ${suggested === 'cancel' ? 'bg-[var(--copper-main)] text-white hover:bg-[var(--copper-light)]' : 'border border-[var(--copper-main)] text-[var(--copper-light)]'}`}
        >
          {busy === 'cancel' && <Loader2 size={14} className="animate-spin" />}
          {view.paid ? 'Cancel and refund' : 'Cancel order'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
    </div>
  );
}
