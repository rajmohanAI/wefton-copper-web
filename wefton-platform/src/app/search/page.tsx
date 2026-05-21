import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchResultsClient from '@/components/search/SearchResultsClient';

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

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-[var(--nav-height)] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
      </div>
    }>
      <SearchResultsClient />
    </Suspense>
  );
}
