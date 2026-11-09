import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

// Only the live site should be indexed; dev/qa/pp hosts block all crawlers.
const isProduction = ['weftoncopper.com', 'www.weftoncopper.com'].includes(new URL(siteUrl).hostname);

export default function robots(): MetadataRoute.Robots {
  if (!isProduction) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/account/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
