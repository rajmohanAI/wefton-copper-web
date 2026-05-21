import type { Metadata } from 'next';
import { Suspense } from 'react';
import CollectionPage from '@/components/catalog/CollectionPage';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

// Ensure static generation at build time
export const dynamic = 'force-static';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  title: 'New Arrivals',
  description:
    'Shop the latest drops from Wefton Copper. Fresh styles in premium Micro-French Terry for men and women.',
  openGraph: {
    title: 'New Arrivals | Wefton Copper',
    description: 'Shop the latest drops from Wefton Copper. Fresh styles in premium Micro-French Terry.',
    url: `${siteUrl}/new-arrivals`,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Wefton Copper New Arrivals' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'New Arrivals | Wefton Copper',
    description: 'Shop the latest drops from Wefton Copper.',
    images: ['/og-image.jpg'],
  },
};

export default function NewArrivalsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-[var(--nav-height)] p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <CollectionPage gender="men" title="New Arrivals" subtitle="The latest drops from Wefton Copper." />
    </Suspense>
  );
}
