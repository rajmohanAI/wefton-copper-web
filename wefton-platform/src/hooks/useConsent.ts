'use client';

import { useSyncExternalStore } from 'react';
import { onConsentChange, readConsent, type ConsentState } from '@/lib/consent';

const subscribe = (notify: () => void) => onConsentChange(notify);

/**
 * The visitor's cookie choices. `undefined` during server render (and the
 * first client render), so nothing flashes before we know; `null` until
 * they answer.
 */
export function useConsent(): ConsentState | null | undefined {
  return useSyncExternalStore<ConsentState | null | undefined>(subscribe, readConsent, () => undefined);
}
