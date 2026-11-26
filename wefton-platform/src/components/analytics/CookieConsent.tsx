'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ALL_OFF, ALL_ON, writeConsent } from '@/lib/consent';
import { useConsent } from '@/hooks/useConsent';
import ConsentPreferences from './ConsentPreferences';

/** Staff tools, and the Cookie Policy page, which has its own choice controls. */
const HIDDEN_ON = ['/admin', '/serialgen', '/seed', '/cookies'];

const CHOICE_BTN =
  'h-9 px-4 rounded text-xs tracking-widest uppercase transition-colors';

/**
 * Cookie question shown until the visitor answers (MRD-01, WC-Issue-34).
 * "Allow all" and "Reject all" carry equal weight; "Preferences" opens
 * one switch per optional purpose. Nothing optional runs before a choice.
 */
export default function CookieConsent() {
  const consent = useConsent();
  const pathname = usePathname() || '';
  const [showPrefs, setShowPrefs] = useState(false);

  if (consent !== null) return null; // answered, or not known yet (server render)
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div
      role="region"
      aria-label="Cookie choice"
      className="fixed z-50 bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm rounded-xl border border-[var(--glass-border)] bg-[var(--bg-darker)] p-4 shadow-2xl"
    >
      <p className="text-sm text-[var(--text-light)] leading-relaxed">
        May we use cookies to see how people use our site? It helps us make it better. Nothing is
        used for ads.{' '}
        <Link href="/cookies" className="text-[var(--copper-light)] underline underline-offset-2">
          Cookie Policy
        </Link>
      </p>

      {showPrefs ? (
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          <ConsentPreferences initial={null} onSaved={() => setShowPrefs(false)} />
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => writeConsent(ALL_ON)}
            className={`${CHOICE_BTN} bg-[var(--copper-main)] text-white hover:bg-[var(--copper-light)]`}
          >
            Allow all
          </button>
          <button
            type="button"
            onClick={() => writeConsent(ALL_OFF)}
            className={`${CHOICE_BTN} bg-[var(--copper-main)] text-white hover:bg-[var(--copper-light)]`}
          >
            Reject all
          </button>
          <button
            type="button"
            onClick={() => setShowPrefs(true)}
            aria-expanded={showPrefs}
            className={`${CHOICE_BTN} border border-[var(--border-subtle)] text-[var(--text-light)] hover:border-[var(--copper-main)]`}
          >
            Preferences
          </button>
        </div>
      )}
    </div>
  );
}
