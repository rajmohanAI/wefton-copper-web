import type { Metadata } from 'next';
import { Suspense } from 'react';
import CollectionPage from '@/components/catalog/CollectionPage';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://weftoncopper.com';

export const metadata: Metadata = {
  title: "Women's Collection",
  description:
    "Shop Wefton Copper Women's Collection — Kurtis, Crop Tops, Active Wear, Palazzo Pants, and more. Elevated silhouettes for the modern woman.",
  openGraph: {
    title: "Women's Collection | Wefton Copper",
    description:
      "Shop Wefton Copper Women's Collection — Elevated silhouettes crafted from premium Micro-French Terry.",
    url: `${siteUrl}/women`,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: "Wefton Copper Women's Collection" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Women's Collection | Wefton Copper",
    description: "Shop Wefton Copper Women's Collection — Premium Micro-French Terry essentials.",
    images: ['/og-image.jpg'],
  },
};

export default function WomenPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-[1280px] mx-auto min-h-screen pt-[var(--nav-height)]">
        {/* Header skeleton matching CollectionPage header dimensions */}
        <div className="w-full bg-[var(--bg-darker)] border-b border-[var(--border-subtle)] pt-12 pb-10 px-4 md:px-8">
          <div className="h-8 w-56 rounded bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse mt-3" />
        </div>
        {/* Category pills skeleton */}
        <div className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-dark)]">
          <div className="w-full px-4 md:px-8 py-4 flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 w-20 rounded-full bg-muted animate-pulse flex-shrink-0" />
            ))}
          </div>
        </div>
        {/* Product grid skeleton */}
        <div className="px-4 md:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    }>
      <CollectionPage gender="women" title="Women's Collection" subtitle="Elevated silhouettes for the modern woman." />
    </Suspense>
  );
}
