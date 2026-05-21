'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import type { Product } from '@/types';

interface FeaturedProductsProps {
  title?: string;
  subtitle?: string;
  products: Product[];
  loading?: boolean;
  viewAllHref?: string;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.165, 0.84, 0.44, 1] as [number, number, number, number] },
  },
};

/**
 * FeaturedProducts — renders a grid of ProductCard components with Framer Motion
 * viewport entrance animations (whileInView). Accepts a `products` prop for reuse
 * across pages (e.g., homepage "Featured Collection" or product detail "You May Also Like").
 *
 * Shows a "Coming Soon" placeholder when no products are available.
 * "Add to Cart" on each ProductCard adds the default variant and opens the CartDrawer.
 */
export default function FeaturedProducts({
  title = 'Featured Collection',
  subtitle,
  products,
  loading = false,
  viewAllHref,
}: FeaturedProductsProps) {
  return (
    <section className="py-20 px-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="flex items-end justify-between mb-12"
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-[var(--copper-light)]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-sm text-[var(--text-muted)] max-w-md">{subtitle}</p>
          )}
        </div>
        {viewAllHref && products.length > 0 && (
          <Link
            href={viewAllHref}
            className="hidden md:flex items-center gap-2 text-xs tracking-widest uppercase text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors group"
          >
            View All
            <ArrowRight
              size={14}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
        )}
      </motion.div>

      {/* Loading state */}
      {loading && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div key={i} variants={itemVariants}>
              <ProductCardSkeleton />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* "Coming Soon" placeholder when no featured products exist */}
      {!loading && products.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-darker)]/50"
        >
          <div className="w-14 h-14 rounded-full bg-[var(--copper-main)]/10 flex items-center justify-center mb-4">
            <Sparkles size={24} className="text-[var(--copper-light)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--text-light)] mb-2">
            Coming Soon
          </h3>
          <p className="text-sm text-[var(--text-muted)] text-center max-w-sm">
            Our curated featured collection is being prepared. Check back soon for handpicked essentials.
          </p>
        </motion.div>
      )}

      {/* Product Grid — staggered viewport entrance animations */}
      {!loading && products.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {products.map((product, i) => (
            <motion.div key={product.productId} variants={itemVariants}>
              <ProductCard product={product} priority={i < 4} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Mobile View All */}
      {viewAllHref && products.length > 0 && (
        <div className="mt-8 text-center md:hidden">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-[var(--copper-light)] border border-[var(--copper-main)] px-6 py-3 rounded hover:bg-[var(--copper-main)] hover:text-white transition-colors"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </section>
  );
}
