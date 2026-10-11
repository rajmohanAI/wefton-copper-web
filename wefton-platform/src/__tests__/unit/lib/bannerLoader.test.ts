import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import bannerLoader, { BANNER_WIDTHS } from '@/lib/bannerLoader';

const SLIDE_SOURCES = [
  '/banners/hero-men-collection.jpg',
  '/banners/hero-women-collection2.png',
  '/banners/hero-new-arrivals.jpg',
];

describe('bannerLoader', () => {
  it('picks the smallest variant that covers the requested width', () => {
    const src = '/banners/hero-men-collection.jpg';
    expect(bannerLoader({ src, width: 320 })).toBe('/banners/hero-men-collection-480.webp');
    expect(bannerLoader({ src, width: 480 })).toBe('/banners/hero-men-collection-480.webp');
    expect(bannerLoader({ src, width: 750 })).toBe('/banners/hero-men-collection-960.webp');
    expect(bannerLoader({ src, width: 1200 })).toBe('/banners/hero-men-collection-1600.webp');
  });

  it('falls back to the largest variant for wider screens', () => {
    expect(bannerLoader({ src: '/banners/hero-new-arrivals.jpg', width: 3840 })).toBe(
      '/banners/hero-new-arrivals-1600.webp'
    );
  });

  it('leaves non-banner paths alone', () => {
    expect(bannerLoader({ src: '/logo.png', width: 640 })).toBe('/logo.png');
  });

  it('every homepage banner has all its variants on disk', () => {
    for (const src of SLIDE_SOURCES) {
      for (const width of BANNER_WIDTHS) {
        const file = path.join(process.cwd(), 'public', bannerLoader({ src, width }));
        expect(existsSync(file), file).toBe(true);
      }
    }
  });
});
