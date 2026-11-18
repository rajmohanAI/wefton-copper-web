import type { Metadata } from 'next';
import VisionClient from '@/components/brand/VisionClient';
import { withCanonical } from '@/lib/seo';

export const metadata: Metadata = withCanonical('/vision', {
  title: 'Our Vision',
  description:
    'Discover the Wefton Copper vision — authenticity, sustainability, craftsmanship, and a brand promise unlike any other.',
  openGraph: {
    title: 'Our Vision | Wefton Copper',
    description:
      'Discover the Wefton Copper vision — authenticity, sustainability, craftsmanship, and a brand promise unlike any other.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Wefton Copper Vision' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Our Vision | Wefton Copper',
    description: 'Discover the Wefton Copper vision — authenticity, sustainability, and craftsmanship.',
    images: ['/og-image.jpg'],
  },
});

export default function VisionPage() {
  return <VisionClient />;
}
