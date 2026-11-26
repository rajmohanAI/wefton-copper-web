import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ALL_OFF, ALL_ON, CONSENT_KEY, hasAnalyticsConsent, hasConsent, onConsentChange, parseConsent, readConsent, writeConsent } from '@/lib/consent';
import { fakeBrowser } from '../helpers/fakeBrowser';

describe('parseConsent', () => {
  it('maps the old single answer to all purposes', () => {
    expect(parseConsent('granted')).toEqual(ALL_ON);
    expect(parseConsent('denied')).toEqual(ALL_OFF);
  });

  it('reads per-purpose choices', () => {
    expect(parseConsent('{"analytics":true,"recordings":false}')).toEqual({ analytics: true, recordings: false });
  });

  it('treats missing or malformed values as no answer', () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent('')).toBeNull();
    expect(parseConsent('{"analytics":true}')).toBeNull();
    expect(parseConsent('not json')).toBeNull();
  });
});

describe('readConsent / writeConsent', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    const target = new EventTarget();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
      },
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
      dispatchEvent: target.dispatchEvent.bind(target),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the same object while nothing changed (needed by useSyncExternalStore)', () => {
    writeConsent({ analytics: true, recordings: false });
    const a = readConsent();
    expect(readConsent()).toBe(a);
    expect(a).toEqual({ analytics: true, recordings: false });
  });

  it('stores choices per purpose and clears them', () => {
    writeConsent({ analytics: false, recordings: true });
    expect(JSON.parse(store[CONSENT_KEY])).toEqual({ analytics: false, recordings: true });
    expect(hasConsent('analytics')).toBe(false);
    expect(hasConsent('recordings')).toBe(true);
    writeConsent(null);
    expect(readConsent()).toBeNull();
  });
});

// MRD-01 cases, on the per-purpose answer (WC-34)
describe('consent in a fake browser (MRD-01)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is null on the server, and saving there does not throw', () => {
    expect(readConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(() => writeConsent(ALL_ON)).not.toThrow();
  });

  it('is null until the visitor chooses', () => {
    const b = fakeBrowser();
    b.window.localStorage.removeItem(CONSENT_KEY);
    expect(readConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('remembers "Allow all" and "Reject all"', () => {
    const b = fakeBrowser();
    writeConsent(ALL_ON);
    expect(JSON.parse(b.window.localStorage.getItem(CONSENT_KEY) ?? '')).toEqual(ALL_ON);
    expect(hasAnalyticsConsent()).toBe(true);
    writeConsent(ALL_OFF);
    expect(readConsent()).toEqual(ALL_OFF);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('ignores an unknown stored value', () => {
    const b = fakeBrowser();
    b.window.localStorage.setItem(CONSENT_KEY, 'maybe');
    expect(readConsent()).toBeNull();
  });

  it('keeps the choice for this page when storage is blocked', () => {
    const b = fakeBrowser();
    b.window.localStorage.throwOnAccess = true;
    expect(() => writeConsent(ALL_OFF)).not.toThrow();
    expect(readConsent()).toEqual(ALL_OFF);
  });

  it('tells listeners about a change in this tab until they stop listening', () => {
    fakeBrowser();
    const listener = vi.fn();
    const stop = onConsentChange(listener);
    writeConsent(ALL_ON);
    expect(listener).toHaveBeenLastCalledWith(ALL_ON);
    stop();
    writeConsent(ALL_OFF);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reacts to another tab changing the same key only', () => {
    const b = fakeBrowser();
    const listener = vi.fn();
    onConsentChange(listener);
    b.window.localStorage.setItem(CONSENT_KEY, 'denied');
    const other = new Event('storage') as Event & { key: string };
    other.key = 'something-else';
    b.window.dispatchEvent(other);
    expect(listener).not.toHaveBeenCalled();
    const same = new Event('storage') as Event & { key: string };
    same.key = CONSENT_KEY;
    b.window.dispatchEvent(same);
    expect(listener).toHaveBeenCalledWith(ALL_OFF);
  });
});
