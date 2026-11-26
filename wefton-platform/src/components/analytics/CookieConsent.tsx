'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { writeConsent } from '@/lib/consent';
import { useConsent } from '@/hooks/useConsent';

/** Staff tools, and the Cookie Policy page, which has its own choice buttons. */
const HIDDEN_ON = ['/admin', '/serialgen', '/seed', '/cookies'];

/**
 * Small cookie question shown until the visitor answers (MRD-01).
 * Analytics stays off until they choose "Allow".
 */
export default function CookieConsent() {
  const consent = useConsent();
  const pathname = usePathname() || '';

  if (consent !== null) return null; // answered, or not known yet (server render)
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div
      role="region"
      aria-label="Cookie choice"
      className="fixed z-50 bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm rounded-xl border border-[var(--glass-border)] bg-[var(--bg-darker)] p-4 shadow-2xl"
    >
      <p className="text-sm text-[var(--text-light)] leading-relaxed">
        May we use cookies to see how people use our site? It helps us make it better. Nothing is
        used for ads.{' '}
        <Link href="/cookies" className="text-[var(--copper-light)] underline underline-offset-2">
          Cookie Policy
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => writeConsent('granted')}
          className="h-9 px-4 rounded bg-[var(--copper-main)] text-white text-xs tracking-widest uppercase hover:bg-[var(--copper-light)] transition-colors"
        >
          Allow
        </button>
        <button
          type="button"
          onClick={() => writeConsent('denied')}
          className="h-9 px-4 rounded border border-[var(--border-subtle)] text-[var(--text-light)] text-xs tracking-widest uppercase hover:border-[var(--copper-main)] transition-colors"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
