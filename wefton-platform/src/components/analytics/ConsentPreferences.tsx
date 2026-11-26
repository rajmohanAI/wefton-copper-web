'use client';

import { useState } from 'react';
import { writeConsent, type ConsentCategory, type ConsentState } from '@/lib/consent';

/** The optional cookie purposes, in the order shown. Essential cookies are always on. */
export const CONSENT_PURPOSES: { key: ConsentCategory; title: string; detail: string }[] = [
  {
    key: 'analytics',
    title: 'Analytics',
    detail: 'Google Analytics: which pages are visited, and which link brought you here.',
  },
  {
    key: 'recordings',
    title: 'Session recordings',
    detail: 'Microsoft Clarity: anonymous heatmaps and recordings that show where the site is confusing.',
  },
];

interface Props {
  /** Current choice, used as the starting position of the switches. */
  initial: ConsentState | null;
  /** Called after saving, e.g. to close the banner panel. */
  onSaved?: () => void;
}

/** Per-purpose switches with a Save button (cookie banner and Cookie Policy page). */
export default function ConsentPreferences({ initial, onSaved }: Props) {
  const [draft, setDraft] = useState<ConsentState>(initial ?? { analytics: false, recordings: false });

  return (
    <div>
      <ul className="space-y-3">
        <li className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--text-light)]">Essential</p>
            <p className="text-xs text-[var(--text-muted)]">Sign-in, cart and checkout. Always on.</p>
          </div>
          <span className="text-xs uppercase tracking-widest text-[var(--text-faint)] pt-0.5">On</span>
        </li>
        {CONSENT_PURPOSES.map((p) => (
          <li key={p.key} className="flex items-start justify-between gap-4">
            <label htmlFor={`consent-${p.key}`} className="cursor-pointer">
              <span className="block text-sm text-[var(--text-light)]">{p.title}</span>
              <span className="block text-xs text-[var(--text-muted)]">{p.detail}</span>
            </label>
            <input
              id={`consent-${p.key}`}
              type="checkbox"
              role="switch"
              checked={draft[p.key]}
              onChange={(e) => {
                setDraft((d) => ({ ...d, [p.key]: e.target.checked }));
              }}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--copper-main)] cursor-pointer"
            />
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <button
          type="button"
          onClick={() => {
            writeConsent(draft);
            onSaved?.();
          }}
          className="h-9 px-4 rounded bg-[var(--copper-main)] text-white text-xs tracking-widest uppercase hover:bg-[var(--copper-light)] transition-colors"
        >
          Save preferences
        </button>
      </div>
    </div>
  );
}
