import type { Metadata } from 'next';
import { Suspense } from 'react';
import AboutClient from '@/components/about/AboutClient';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about Wefton Copper — the brand redefining premium essential wear from the thread up.',
  openGraph: {
    title: 'About Us | Wefton Copper',
    description:
      'Learn about Wefton Copper — the brand redefining premium essential wear from the thread up.',
    url: `${siteUrl}/about`,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'About Wefton Copper' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us | Wefton Copper',
    description: 'Learn about Wefton Copper — redefining premium essential wear.',
    images: ['/og-image.jpg'],
  },
};

export default function AboutPage() {
  return (
    <Suspense>
      <AboutClient />
    </Suspense>
  );
}
