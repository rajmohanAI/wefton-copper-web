import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ALL_OFF, ALL_ON, CONSENT_KEY, hasConsent, parseConsent, readConsent, writeConsent } from '@/lib/consent';

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
