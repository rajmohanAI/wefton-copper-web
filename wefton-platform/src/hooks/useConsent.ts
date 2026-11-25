'use client';

import { useSyncExternalStore } from 'react';
import { onConsentChange, readConsent, type ConsentChoice } from '@/lib/consent';

const subscribe = (notify: () => void) => onConsentChange(notify);

/**
 * The visitor's analytics cookie answer. `undefined` during server render
 * (and the first client render), so nothing flashes before we know.
 */
export function useConsent(): ConsentChoice | null | undefined {
  return useSyncExternalStore<ConsentChoice | null | undefined>(subscribe, readConsent, () => undefined);
}
