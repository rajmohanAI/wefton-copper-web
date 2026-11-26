// ============================================================
// Wefton Copper — analytics cookie choice (MRD-01)
// The visitor's answer to the cookie banner lives in localStorage. Google
// Analytics, Microsoft Clarity and campaign-link saving run only after
// "granted". Changing the answer tells every listener in this tab.
// ============================================================

export type ConsentChoice = 'granted' | 'denied';

export const CONSENT_KEY = 'wc-analytics-consent';
const CHANGE_EVENT = 'wc-consent-change';

/** The stored answer, or null while the visitor hasn't chosen yet. */
export function readConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

/** Saves an answer (or clears it with null, which shows the banner again). */
export function writeConsent(choice: ConsentChoice | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (choice) window.localStorage.setItem(CONSENT_KEY, choice);
    else window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Storage blocked (private mode): the choice lasts for this page only.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: choice }));
}

export function hasAnalyticsConsent(): boolean {
  return readConsent() === 'granted';
}

/** Calls `listener` whenever the answer changes, here or in another tab. */
export function onConsentChange(listener: (choice: ConsentChoice | null) => void): () => void {
  const local = () => listener(readConsent());
  const other = (e: StorageEvent) => {
    if (e.key === CONSENT_KEY) listener(readConsent());
  };
  window.addEventListener(CHANGE_EVENT, local);
  window.addEventListener('storage', other);
  return () => {
    window.removeEventListener(CHANGE_EVENT, local);
    window.removeEventListener('storage', other);
  };
}
