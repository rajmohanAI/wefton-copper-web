import type { Metadata } from 'next';
import { Suspense } from 'react';
import CollectionPage from '@/components/catalog/CollectionPage';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';


const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  title: 'Bestsellers',
  description:
    'Shop the most loved pieces from Wefton Copper. Our community favourites in premium Cotton Fabric.',
  openGraph: {
    title: 'Bestsellers | Wefton Copper',
    description: 'Shop the most loved pieces from Wefton Copper. Our community favourites.',
    url: `${siteUrl}/bestsellers`,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Wefton Copper Bestsellers' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bestsellers | Wefton Copper',
    description: 'Shop the most loved pieces from Wefton Copper.',
    images: ['/og-image.jpg'],
  },
};

export default function BestsellersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-[var(--nav-height)] p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <CollectionPage gender="men" title="Bestsellers" subtitle="The pieces our community loves most." />
    </Suspense>
  );
}
