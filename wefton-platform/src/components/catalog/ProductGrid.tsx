import ProductCard from '@/components/product/ProductCard';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import type { Product } from '@/types';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
}

/**
 * Responsive CSS Grid layout for product cards.
 * - 1 column at mobile (375px)
 * - 2 columns at tablet (768px / sm breakpoint)
 * - 3–4 columns at desktop (1024px+)
 * - Uses auto-fill with minmax(280px, 1fr) for fluid responsiveness
 * - No animations — immediate visibility only
 * - Shows skeleton loaders during loading, transitions directly to content
 */
export default function ProductGrid({ products, loading, skeletonCount = 8 }: ProductGridProps) {
  const gridClassName =
    'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr';

  if (loading) {
    return (
      <div
        className={gridClassName}
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonLoader key={i} variant="product-card" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={gridClassName}
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
    >
      {products.map((product, i) => (
        <ProductCard key={product.productId} product={product} priority={i < 4} />
      ))}
    </div>
  );
}
