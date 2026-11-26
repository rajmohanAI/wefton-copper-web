// ============================================================
// Wefton Copper — analytics cookie choice (MRD-01)
// ============================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_KEY, hasAnalyticsConsent, onConsentChange, readConsent, writeConsent } from '@/lib/consent';
import { fakeBrowser } from '../helpers/fakeBrowser';

afterEach(() => vi.unstubAllGlobals());

describe('readConsent / writeConsent', () => {
  it('is null on the server (no window)', () => {
    expect(readConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
    expect(() => writeConsent('granted')).not.toThrow();
  });

  it('is null until the visitor chooses', () => {
    fakeBrowser();
    expect(readConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('remembers "granted" and "denied"', () => {
    const b = fakeBrowser();
    writeConsent('granted');
    expect(b.window.localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(readConsent()).toBe('granted');
    expect(hasAnalyticsConsent()).toBe(true);

    writeConsent('denied');
    expect(readConsent()).toBe('denied');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('clears the answer with null, so the banner shows again', () => {
    const b = fakeBrowser();
    writeConsent('granted');
    writeConsent(null);
    expect(b.window.localStorage.getItem(CONSENT_KEY)).toBeNull();
    expect(readConsent()).toBeNull();
  });

  it('ignores an unknown stored value', () => {
    const b = fakeBrowser();
    b.window.localStorage.setItem(CONSENT_KEY, 'maybe');
    expect(readConsent()).toBeNull();
  });

  it('treats blocked storage as "not chosen" and does not throw on save', () => {
    const b = fakeBrowser();
    b.window.localStorage.throwOnAccess = true;
    expect(readConsent()).toBeNull();
    expect(() => writeConsent('granted')).not.toThrow();
  });
});

describe('onConsentChange', () => {
  it('tells listeners about a change in this tab', () => {
    fakeBrowser();
    const listener = vi.fn();
    const stop = onConsentChange(listener);
    writeConsent('granted');
    expect(listener).toHaveBeenLastCalledWith('granted');
    stop();
    writeConsent('denied');
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
    expect(listener).toHaveBeenCalledWith('denied');
  });
});
