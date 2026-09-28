import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchResultsClient from '@/components/search/SearchResultsClient';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search Wefton Copper products — find your perfect premium essential.',
  openGraph: {
    title: 'Search | Wefton Copper',
    description: 'Search Wefton Copper products.',
  },
  twitter: {
    card: 'summary',
    title: 'Search | Wefton Copper',
    description: 'Search Wefton Copper products.',
  },
  robots: { index: false },
};

/**
 * Search page skeleton matching above-the-fold layout:
 * - Header area with title placeholder
 * - Product grid with card skeletons (aspect-[3/4] image matching ProductCard)
 */
function SearchPageSkeleton() {
  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      {/* Header skeleton matching SearchResultsClient header */}
      <div className="bg-[var(--bg-darker)] border-b border-[var(--border-subtle)] py-12 px-4 md:px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        </div>
      </div>
      {/* Product grid skeleton */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchResultsClient />
    </Suspense>
  );
}
