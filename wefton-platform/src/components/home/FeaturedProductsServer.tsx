import FeaturedProducts from './FeaturedProducts';
import { getFeaturedProducts, getBestsellerProducts } from '@/services/productService';

import type { Product } from '@/types';
import { FEATURES } from '@/config/features';

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

  // With no featured products the section would only show the "Coming Soon"
  // placeholder, which is switched off for now (FEATURES.comingSoonBlock).
  const showFeatured = featured.length > 0 || FEATURES.comingSoonBlock;
  if (!showFeatured && bestsellers.length === 0) return null;

  return (
    <>
      {showFeatured && (
        <FeaturedProducts
          title="Featured Collection"
          subtitle=""
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
    </>
  );
}
