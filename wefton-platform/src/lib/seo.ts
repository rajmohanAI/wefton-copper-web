import type { Metadata } from 'next';

/** The one public address of the site (non-www redirects here). */
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.weftoncopper.com';

export const DEFAULT_OG_IMAGE = { url: '/og-image.jpg', width: 1200, height: 630, alt: 'Wefton Copper' };

/**
 * Adds a canonical URL and a matching og:url to a page's metadata.
 * Next.js sets no canonical by default, and a page's openGraph replaces the
 * layout's, so without this every page shared the homepage's og:url.
 * Paths are relative; metadataBase (in the root layout) makes them absolute.
 */
export function withCanonical(path: string, meta: Metadata): Metadata {
  const pageTitle = typeof meta.title === 'string' ? `${meta.title} | Wefton Copper` : undefined;
  return {
    ...meta,
    alternates: { ...meta.alternates, canonical: path },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: 'Wefton Copper',
      images: [DEFAULT_OG_IMAGE],
      ...(pageTitle ? { title: pageTitle } : {}),
      ...(typeof meta.description === 'string' ? { description: meta.description } : {}),
      ...meta.openGraph,
      url: path,
    },
  };
}
