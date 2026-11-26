'use client';

import { writeConsent } from '@/lib/consent';
import { useConsent } from '@/hooks/useConsent';

const LABEL = { granted: 'Allowed', denied: 'Not allowed' } as const;

/** Shows the visitor's current analytics choice and lets them change it. */
export default function CookieChoiceButton() {
  const consent = useConsent();
  if (consent === undefined) return null;
  return (
    <p className="mt-3">
      Your choice: <strong>{consent ? LABEL[consent] : 'Not chosen yet'}</strong>.{' '}
      {consent === 'granted' ? (
        <button type="button" onClick={() => writeConsent('denied')} className="text-[var(--copper-light)] underline underline-offset-2">
          Turn analytics cookies off
        </button>
      ) : (
        <button type="button" onClick={() => writeConsent('granted')} className="text-[var(--copper-light)] underline underline-offset-2">
          Allow analytics cookies
        </button>
      )}
    </p>
  );
}
