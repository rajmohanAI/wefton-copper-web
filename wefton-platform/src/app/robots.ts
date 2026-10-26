import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';
const siteEnv = process.env.NEXT_PUBLIC_SITE_ENV;

export default function robots(): MetadataRoute.Robots {
  // Keep dev, qa and pp out of search results.
  if (siteEnv && siteEnv !== 'production') {
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
