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
    // Firebase not configured yet — show empty state with "Coming Soon" placeholder
  }

  return (
    <>
      {/* Always render FeaturedProducts — shows "Coming Soon" placeholder when empty */}
      <FeaturedProducts
        title="Featured Collection"
        subtitle="Handpicked essentials from our latest drop"
        products={featured}
        viewAllHref="/men"
      />

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
    </>
  );
}
