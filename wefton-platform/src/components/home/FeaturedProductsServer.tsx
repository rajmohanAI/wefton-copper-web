import FeaturedProducts from './FeaturedProducts';
import { getFeaturedProducts, getBestsellerProducts } from '@/services/productService';

import type { Product } from '@/types';

export default async function FeaturedProductsServer() {
  // Fetch in parallel — gracefully handle missing Firebase config
  let featured: Product[] = [];
  let bestsellers: Product[] = [];

  try {
    [featured, bestsellers] = await Promise.all([
      getFeaturedProducts(8),
      getBestsellerProducts(4),
    ]);
  } catch {
    // Firebase not configured yet — show empty state
  }

  return (
    <>
      {featured.length > 0 && (
        <FeaturedProducts
          title="Featured Collection"
          subtitle="Handpicked essentials from our latest drop"
          products={featured}
          viewAllHref="/men"
        />
      )}
      {bestsellers.length > 0 && (
        <div className="bg-[var(--bg-darker)]">
          <FeaturedProducts
            title="Bestsellers"
            subtitle="The pieces our community loves most"
            products={bestsellers}
            viewAllHref="/bestsellers"
          />
        </div>
      )}
      {featured.length === 0 && bestsellers.length === 0 && (
        <div className="py-20 px-6 max-w-[1400px] mx-auto text-center">
          <p className="text-[var(--text-muted)] text-sm">
            Products will appear here once the catalog is set up.
          </p>
        </div>
      )}
    </>
  );
}
