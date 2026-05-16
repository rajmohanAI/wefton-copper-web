import type { Metadata } from 'next';
import { Suspense } from 'react';
import CollectionPage from '@/components/catalog/CollectionPage';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';

export const metadata: Metadata = {
  title: "Women's Collection",
  description:
    "Shop Wefton Copper Women's Collection — Kurtis, Crop Tops, Active Wear, Palazzo Pants, and more. Elevated silhouettes for the modern woman.",
};

export default function WomenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-[var(--nav-height)] p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <CollectionPage gender="women" title="Women's Collection" subtitle="Elevated silhouettes for the modern woman." />
    </Suspense>
  );
}
