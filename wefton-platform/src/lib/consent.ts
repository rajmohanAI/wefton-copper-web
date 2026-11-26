// ============================================================
// Wefton Copper — cookie choices (MRD-01, WC-Issue-34)
// The visitor's answer to the cookie banner lives in localStorage, one
// switch per optional purpose:
//   analytics  — Google Analytics 4 and campaign-link saving
//   recordings — Microsoft Clarity heatmaps and session recordings
// Nothing optional runs until its switch is on. Changing the answer tells
// every listener in this tab and in other tabs.
// ============================================================

export interface ConsentState {
  analytics: boolean;
  recordings: boolean;
}

export type ConsentCategory = keyof ConsentState;

export const CONSENT_KEY = 'wc-analytics-consent';
const CHANGE_EVENT = 'wc-consent-change';

export const ALL_ON: ConsentState = { analytics: true, recordings: true };
export const ALL_OFF: ConsentState = { analytics: false, recordings: false };

/** Turns a stored value into a state. Older visitors stored 'granted' / 'denied'. */
export function parseConsent(raw: string | null): ConsentState | null {
  if (raw === 'granted') return ALL_ON;
  if (raw === 'denied') return ALL_OFF;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ConsentState>;
    if (typeof v?.analytics === 'boolean' && typeof v?.recordings === 'boolean') {
      return { analytics: v.analytics, recordings: v.recordings };
    }
  } catch {
    // fall through
  }
  return null;
}

// Used when storage is blocked (private mode): the choice lasts for this page only.
let memoryRaw: string | null = null;

// useSyncExternalStore needs the same object back while nothing changed.
let lastRaw: string | null | undefined;
let lastState: ConsentState | null = null;

/** The stored answer, or null while the visitor hasn't chosen yet. */
export function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CONSENT_KEY);
  } catch {
    raw = memoryRaw;
  }
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastState = parseConsent(raw);
  }
  return lastState;
}

/** Saves an answer (or clears it with null, which shows the banner again). */
export function writeConsent(state: ConsentState | null): void {
  if (typeof window === 'undefined') return;
  const raw = state ? JSON.stringify({ analytics: state.analytics, recordings: state.recordings }) : null;
  memoryRaw = raw;
  try {
    if (raw) window.localStorage.setItem(CONSENT_KEY, raw);
    else window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Storage blocked: memoryRaw keeps the choice for this page.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: state }));
}

export function hasConsent(category: ConsentCategory): boolean {
  return readConsent()?.[category] === true;
}

export function hasAnalyticsConsent(): boolean {
  return hasConsent('analytics');
}

/** Calls `listener` whenever the answer changes, here or in another tab. */
export function onConsentChange(listener: (state: ConsentState | null) => void): () => void {
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
