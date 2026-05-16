'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import type { Product } from '@/types';

interface FeaturedProductsProps {
  title: string;
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

export default function FeaturedProducts({
  title,
  subtitle,
  products,
  loading = false,
  viewAllHref,
}: FeaturedProductsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-20 px-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
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
        {viewAllHref && (
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

      {/* Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <motion.div key={i} variants={itemVariants}>
                <ProductCardSkeleton />
              </motion.div>
            ))
          : products.map((product, i) => (
              <motion.div key={product.productId} variants={itemVariants}>
                <ProductCard product={product} priority={i < 4} />
              </motion.div>
            ))}
      </motion.div>

      {/* Mobile View All */}
      {viewAllHref && (
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
