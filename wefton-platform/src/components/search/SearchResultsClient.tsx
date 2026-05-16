'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { searchProducts } from '@/services/productService';
import ProductCard from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import type { Product } from '@/types';

export default function SearchResultsClient() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    searchProducts(q)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      <div className="bg-[var(--bg-darker)] border-b border-[var(--border-subtle)] py-12 px-6">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="text-3xl font-light text-[var(--copper-light)] flex items-center gap-3">
            <Search size={28} />
            {q ? `Results for "${q}"` : 'Search'}
          </h1>
          {!loading && q && (
            <p className="mt-2 text-[var(--text-muted)]">{products.length} products found</p>
          )}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 && q ? (
          <div className="text-center py-20">
            <Search size={48} className="text-[var(--text-faint)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">No results for &ldquo;{q}&rdquo;</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {products.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
