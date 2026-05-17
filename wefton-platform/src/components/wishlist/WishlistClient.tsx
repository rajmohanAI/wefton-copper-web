'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useWishlistStore } from '@/store/wishlistStore';
import { getProductById } from '@/services/productService';
import ProductCard from '@/components/product/ProductCard';
import Button from '@/components/ui/Button';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import type { Product } from '@/types';

export default function WishlistClient() {
  const { items } = useWishlistStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) { setLoading(false); return; }
    Promise.all(items.map((id) => getProductById(id)))
      .then((results) => setProducts(results.filter(Boolean) as Product[]))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [items]);

  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      <div className="bg-[var(--bg-darker)] border-b border-[var(--border-subtle)] py-12 px-6">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="text-4xl font-light text-[var(--copper-light)] flex items-center gap-3">
            <Heart size={32} /> Wishlist
          </h1>
          <p className="mt-2 text-[var(--text-muted)]">{items.length} saved items</p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={48} className="text-[var(--text-faint)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)] mb-6">Your wishlist is empty</p>
            <Link href="/men">
              <Button variant="copper">Start Shopping</Button>
            </Link>
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
