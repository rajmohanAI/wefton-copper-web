import { describe, it, expect } from 'vitest';
import { parseLanding, sanitizeAttribution } from '@/lib/attribution';

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
