'use client';

import { useState } from 'react';
import { useConsent } from '@/hooks/useConsent';
import ConsentPreferences from './ConsentPreferences';

/** Cookie Policy page: the visitor's current choices, with switches to change them. */
export default function CookieChoiceButton() {
  const consent = useConsent();
  const [saved, setSaved] = useState(false);
  if (consent === undefined) return null;
  return (
    <div className="mt-4 rounded-xl border border-[var(--glass-border)] p-4">
      {consent === null && (
        <p className="mb-3 text-xs text-[var(--text-muted)]">You haven&apos;t chosen yet. Optional cookies are off.</p>
      )}
      {/* key: reset the switches if the choice changes elsewhere (another tab). */}
      <ConsentPreferences key={JSON.stringify(consent)} initial={consent} onSaved={() => setSaved(true)} />
      <p role="status" className="mt-2 text-xs text-[var(--text-muted)]">
        {saved ? 'Saved.' : ''}
      </p>
    </div>
  );
}
