import { afterEach, describe, it, expect, vi } from 'vitest';
import { ATTRIBUTION_KEY, attributionForSave, captureLanding, parseLanding, sanitizeAttribution } from '@/lib/attribution';
import { writeConsent } from '@/lib/consent';
import { fakeBrowser } from '../helpers/fakeBrowser';

const NOW = new Date('2026-11-25T10:00:00Z');

describe('parseLanding', () => {
  it('keeps campaign tags, the landing page and the referring site', () => {
    const r = parseLanding(
      'https://www.weftoncopper.com/men?utm_source=instagram&utm_medium=social&utm_campaign=launch&x=1',
      'https://l.instagram.com/',
      NOW,
    );
    expect(r).toEqual({
      utm_source: 'instagram',
      utm_medium: 'social',
      utm_campaign: 'launch',
      referrer: 'l.instagram.com',
      landingPage: '/men',
      landedAt: NOW.toISOString(),
    });
  });

  it('records a direct visit with just the landing page', () => {
    expect(parseLanding('https://www.weftoncopper.com/', '', NOW)).toEqual({ landingPage: '/', landedAt: NOW.toISOString() });
  });

  it('ignores a move between our own pages', () => {
    expect(parseLanding('https://www.weftoncopper.com/women', 'https://weftoncopper.com/men', NOW)).toBeNull();
  });

  it('still records tags on a link from our own site', () => {
    const r = parseLanding('https://www.weftoncopper.com/?utm_source=newsletter', 'https://www.weftoncopper.com/x', NOW);
    expect(r?.utm_source).toBe('newsletter');
    expect(r?.referrer).toBeUndefined();
  });

  it('cuts very long values', () => {
    const r = parseLanding(`https://www.weftoncopper.com/?utm_campaign=${'a'.repeat(400)}`, '', NOW);
    expect(r?.utm_campaign).toHaveLength(150);
  });

  it('returns null for a broken address', () => {
    expect(parseLanding('not a url', '', NOW)).toBeNull();
  });
});

describe('sanitizeAttribution', () => {
  it('keeps only known string fields', () => {
    expect(sanitizeAttribution({ utm_source: ' ig ', evil: 'x', gclid: 5, landingPage: '/men' })).toEqual({ utm_source: 'ig', landingPage: '/men' });
  });

  it('returns null for nothing useful', () => {
    expect(sanitizeAttribution(null)).toBeNull();
    expect(sanitizeAttribution('x')).toBeNull();
    expect(sanitizeAttribution({ other: 'x' })).toBeNull();
  });
});

// ── In the browser: remembering the visit, and what gets saved ──

afterEach(() => vi.unstubAllGlobals());

describe('captureLanding', () => {
  it('does nothing on the server', () => {
    expect(() => captureLanding()).not.toThrow();
  });

  it('keeps the first landing of the visit', () => {
    const b = fakeBrowser('https://www.weftoncopper.com/men?utm_source=instagram', 'https://l.instagram.com/');
    captureLanding();
    b.visit('https://www.weftoncopper.com/women'); // in-app move; referrer stays Instagram
    captureLanding();
    const saved = JSON.parse(b.window.sessionStorage.getItem(ATTRIBUTION_KEY)!);
    expect(saved).toMatchObject({ utm_source: 'instagram', landingPage: '/men', referrer: 'l.instagram.com' });
  });

  it('lets a newer tagged link replace an untagged landing', () => {
    const b = fakeBrowser('https://www.weftoncopper.com/', '');
    captureLanding();
    b.visit('https://www.weftoncopper.com/new-arrivals?utm_source=newsletter&utm_campaign=dec');
    captureLanding();
    const saved = JSON.parse(b.window.sessionStorage.getItem(ATTRIBUTION_KEY)!);
    expect(saved).toMatchObject({ utm_source: 'newsletter', utm_campaign: 'dec', landingPage: '/new-arrivals' });
  });

  it('survives blocked storage', () => {
    const b = fakeBrowser('https://www.weftoncopper.com/?utm_source=x');
    b.window.sessionStorage.throwOnAccess = true;
    expect(() => captureLanding()).not.toThrow();
  });
});

describe('attributionForSave', () => {
  it('returns nothing without analytics consent', () => {
    fakeBrowser('https://www.weftoncopper.com/?utm_source=instagram');
    captureLanding();
    expect(attributionForSave()).toBeNull();
    writeConsent('denied');
    expect(attributionForSave()).toBeNull();
  });

  it('returns the cleaned record once the visitor allows analytics', () => {
    fakeBrowser('https://www.weftoncopper.com/men?utm_source=instagram&fbclid=abc');
    captureLanding();
    writeConsent('granted');
    expect(attributionForSave()).toMatchObject({ utm_source: 'instagram', fbclid: 'abc', landingPage: '/men' });
  });

  it('returns null for nothing stored or a broken record', () => {
    const b = fakeBrowser();
    writeConsent('granted');
    expect(attributionForSave()).toBeNull();
    b.window.sessionStorage.setItem(ATTRIBUTION_KEY, '{not json');
    expect(attributionForSave()).toBeNull();
  });
});
