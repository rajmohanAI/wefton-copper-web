'use client';

import { useState } from 'react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // TODO: persist to Firestore newsletter collection
    setStatus('success');
    setEmail('');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <form className="flex gap-2 w-full md:w-auto" onSubmit={handleSubmit}>
      {status === 'success' ? (
        <p className="text-xs text-emerald-400 py-2">
          You&apos;re on the list. Welcome to the circle.
        </p>
      ) : (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            required
            className="flex-1 md:w-64 h-10 bg-white/5 border border-white/10 rounded px-4 text-sm text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)] transition-colors"
          />
          <button
            type="submit"
            className="h-10 px-5 bg-[var(--copper-main)] text-white text-xs tracking-widest uppercase rounded hover:bg-[var(--copper-light)] transition-colors"
          >
            Subscribe
          </button>
        </>
      )}
    </form>
  );
}
