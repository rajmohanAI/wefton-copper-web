// ============================================================
// Wefton Copper — sitemap.xml contents (MRD-01)
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';

let products: Record<string, unknown>[] = [];
let dbAvailable = true;
let failRead = false;

vi.mock('@/lib/firebase', () => ({ getFirebaseDb: () => (dbAvailable ? {} : null) }));
vi.mock('firebase/firestore', () => ({
  collection: () => 'products',
  getDocs: async () => {
    if (failRead) throw new Error('offline');
    return { docs: products.map((p) => ({ data: () => p })) };
  },
}));

import sitemap from '@/app/sitemap';

const SITE = 'https://www.weftoncopper.com';

beforeEach(() => {
  products = [];
  dbAvailable = true;
  failRead = false;
});

describe('sitemap', () => {
  it('lists the shop, brand and trust pages', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    for (const path of ['', '/men', '/women', '/new-arrivals', '/bestsellers', '/vision', '/about', '/check-product', '/size-guide', '/wash-care', '/contact', '/shipping', '/returns', '/refund-policy', '/terms', '/privacy', '/cookies']) {
      expect(urls).toContain(`${SITE}${path}`);
    }
  });

  it('leaves out private and noindex pages', async () => {
    const urls = (await sitemap()).map((e) => e.url).join(' ');
    for (const path of ['/account', '/checkout', '/admin', '/wishlist', '/search', '/serialgen', '/unsubscribe', '/welcomeuser']) {
      expect(urls).not.toContain(`${SITE}${path}`);
    }
  });

  it('gives static pages no made-up last-modified date', async () => {
    const statics = (await sitemap()).filter((e) => !e.url.includes('/products/'));
    expect(statics.every((e) => e.lastModified === undefined)).toBe(true);
  });

  it("uses each product's own update or create date, skipping products without a slug", async () => {
    products = [
      { slug: 'tee-a', updatedAt: { toDate: () => new Date('2026-11-20T00:00:00Z') }, createdAt: '2026-10-01T00:00:00Z' },
      { slug: 'tee-b', createdAt: '2026-10-05T00:00:00Z' },
      { slug: 'tee-c' },
      { slug: 'tee-d', createdAt: 'not a date' },
      { title: 'no slug' },
    ];
    const entries = (await sitemap()).filter((e) => e.url.includes('/products/'));
    expect(entries.map((e) => e.url)).toEqual([`${SITE}/products/tee-a`, `${SITE}/products/tee-b`, `${SITE}/products/tee-c`, `${SITE}/products/tee-d`]);
    expect(entries[0].lastModified).toEqual(new Date('2026-11-20T00:00:00Z'));
    expect(entries[1].lastModified).toEqual(new Date('2026-10-05T00:00:00Z'));
    expect(entries[2].lastModified).toBeUndefined();
    expect(entries[3].lastModified).toBeUndefined();
  });

  it('still returns the static pages when the database is missing or unreachable', async () => {
    dbAvailable = false;
    expect((await sitemap()).length).toBe(17);
    dbAvailable = true;
    failRead = true;
    expect((await sitemap()).length).toBe(17);
  });
});
