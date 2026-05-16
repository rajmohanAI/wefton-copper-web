import type { Metadata } from 'next';
import { Suspense } from 'react';
import CollectionPage from '@/components/catalog/CollectionPage';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

export const metadata: Metadata = {
  title: "Men's Collection",
  description:
    "Shop Wefton Copper Men's Collection — Premium Tees, Polos, Oversized, Active Wear, Hoodies, and more. Crafted from Micro-French Terry.",
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
