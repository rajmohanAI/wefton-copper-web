import type { Metadata } from 'next';
import { Suspense } from 'react';
import CollectionPage from '@/components/catalog/CollectionPage';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  title: "Men's Collection",
  description:
    "Shop Wefton Copper Men's Collection — Premium Tees, Polos, Oversized, Active Wear, Hoodies, and more. Crafted from Micro-French Terry.",
  openGraph: {
    title: "Men's Collection | Wefton Copper",
    description:
      "Shop Wefton Copper Men's Collection — Premium Tees, Polos, Oversized, Active Wear, Hoodies, and more.",
    url: `${siteUrl}/men`,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: "Wefton Copper Men's Collection" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Men's Collection | Wefton Copper",
    description: "Shop Wefton Copper Men's Collection — Premium Micro-French Terry essentials.",
    images: ['/og-image.jpg'],
  },
};

export default function MenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-[var(--nav-height)] p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <CollectionPage gender="men" title="Men's Collection" subtitle="Engineered for precision. Crafted from lightweight Micro-French Terry." />
    </Suspense>
  );
}
