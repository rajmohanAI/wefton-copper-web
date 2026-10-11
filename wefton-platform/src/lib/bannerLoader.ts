import type { ImageLoaderProps } from 'next/image';

/** Widths built by scripts/make-banner-variants.mjs. */
export const BANNER_WIDTHS = [480, 960, 1600] as const;

/**
 * next/image loader for /banners/*: maps the requested width to the
 * smallest pre-built WebP variant that covers it (largest if none does),
 * e.g. /banners/hero-men-collection.jpg @ 750w -> /banners/hero-men-collection-960.webp.
 * Other paths are returned unchanged.
 */
export default function bannerLoader({ src, width }: ImageLoaderProps): string {
  if (!src.startsWith('/banners/')) return src;
  const variant = BANNER_WIDTHS.find((w) => w >= width) ?? BANNER_WIDTHS[BANNER_WIDTHS.length - 1];
  return `${src.replace(/\.[^./]+$/, '')}-${variant}.webp`;
}
