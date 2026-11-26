// ============================================================
// Wefton Copper — Google Analytics and Clarity load only with consent
// and a valid ID (MRD-01)
// ============================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ReactNode } from 'react';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/script', () => ({
  default: (p: { id?: string; src?: string; children?: ReactNode }) =>
    createElement('script', { 'data-id': p.id, 'data-src': p.src }, p.children),
}));

async function renderGA(consentGranted: boolean, env: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '');
  vi.stubEnv('NEXT_PUBLIC_GA4_MEASUREMENT_ID', '');
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const { default: GA4Provider } = await import('@/components/analytics/GA4Provider');
  return renderToStaticMarkup(createElement(GA4Provider, { consentGranted }));
}

async function renderClarity(consentGranted: boolean, id: string) {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_CLARITY_PROJECT_ID', id);
  const { default: ClarityProvider } = await import('@/components/analytics/ClarityProvider');
  return renderToStaticMarkup(createElement(ClarityProvider, { consentGranted }));
}

afterEach(() => vi.unstubAllEnvs());

describe('GA4Provider', () => {
  it('loads nothing before consent', async () => {
    expect(await renderGA(false, { NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-CQZQLEW9NR' })).toBe('');
  });

  it('loads gtag with the ID hosting sets (NEXT_PUBLIC_GA_MEASUREMENT_ID)', async () => {
    const html = await renderGA(true, { NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-CQZQLEW9NR' });
    expect(html).toContain('googletagmanager.com/gtag/js?id=G-CQZQLEW9NR');
    expect(html).toContain("gtag('config', 'G-CQZQLEW9NR')");
  });

  it('still accepts the old variable name', async () => {
    expect(await renderGA(true, { NEXT_PUBLIC_GA4_MEASUREMENT_ID: 'G-OLD123' })).toContain('id=G-OLD123');
  });

  it('stays off for "off" (QA/dev) or anything that is not a G- ID', async () => {
    expect(await renderGA(true, { NEXT_PUBLIC_GA_MEASUREMENT_ID: 'off' })).toBe('');
    expect(await renderGA(true, { NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-1');alert(1);//" })).toBe('');
    expect(await renderGA(true, {})).toBe('');
  });
});

describe('ClarityProvider', () => {
  it('loads nothing before consent', async () => {
    expect(await renderClarity(false, 'abc123test')).toBe('');
  });

  it('loads the Clarity tag with a valid project ID', async () => {
    expect(await renderClarity(true, 'abc123test')).toContain('"script", "abc123test"');
  });

  it('stays off without an ID, with "off", or with an unsafe value', async () => {
    expect(await renderClarity(true, '')).toBe('');
    expect(await renderClarity(true, 'off')).toBe('');
    expect(await renderClarity(true, 'abc");alert(1)//')).toBe('');
  });
});
