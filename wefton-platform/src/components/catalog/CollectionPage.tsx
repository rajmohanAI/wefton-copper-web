'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Grid3X3, List, X } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import FilterSidebar from './FilterSidebar';
import { getProductsByGender } from '@/services/productService';
import { MEN_CATEGORIES, WOMEN_CATEGORIES } from '@/config/brand';
import type { Product, FilterState } from '@/types';
import Button from '@/components/ui/Button';

interface CollectionPageProps {
  gender: 'men' | 'women';
  title: string;
  subtitle: string;
}

const DEFAULT_FILTERS: FilterState = {
  category: [],
  gender: [],
  priceRange: [0, 5000],
  rating: 0,
  availability: false,
  newArrivals: false,
  bestsellers: false,
  sortBy: 'newest',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'bestseller', label: 'Bestsellers' },
] as const;

export default function CollectionPage({ gender, title, subtitle }: CollectionPageProps) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    category: categoryParam ? [categoryParam] : [],
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [lastDoc, setLastDoc] = useState<unknown>(null);

  const categories = gender === 'men' ? MEN_CATEGORIES : WOMEN_CATEGORIES;

  const loadProducts = useCallback(
    async (reset = true) => {
      setLoading(true);
      try {
        const { products: newProducts, lastDoc: newLastDoc } = await getProductsByGender(
          gender,
          filters,
          reset ? undefined : (lastDoc as Parameters<typeof getProductsByGender>[2])
        );
        setProducts((prev) => (reset ? newProducts : [...prev, ...newProducts]));
        setLastDoc(newLastDoc);
        setHasMore(newProducts.length === 12);
      } catch {
        // Firebase not configured — show empty state
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gender, filters]
  );

  useEffect(() => {
    loadProducts(true);
  }, [loadProducts]);

  const activeFilterCount = [
    filters.category.length > 0,
    filters.availability,
    filters.newArrivals,
    filters.bestsellers,
    filters.rating > 0,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      {/* Page Header */}
      <div className="bg-[var(--bg-darker)] border-b border-[var(--border-subtle)] py-12 px-6">
        <div className="max-w-[1400px] mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-light text-[var(--copper-light)]"
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-2 text-[var(--text-muted)]"
          >
            {subtitle}
          </motion.p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-dark)]">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilters((f) => ({ ...f, category: [] }))}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs tracking-wider uppercase transition-colors ${
              filters.category.length === 0
                ? 'bg-[var(--copper-main)] text-white'
                : 'bg-white/5 text-[var(--text-muted)] hover:text-[var(--copper-light)] border border-white/10'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  category: f.category.includes(cat.slug)
                    ? f.category.filter((c) => c !== cat.slug)
                    : [cat.slug],
                }))
              }
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs tracking-wider uppercase transition-colors ${
                filters.category.includes(cat.slug)
                  ? 'bg-[var(--copper-main)] text-white'
                  : 'bg-white/5 text-[var(--text-muted)] hover:text-[var(--copper-light)] border border-white/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-2 text-xs tracking-wider uppercase text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors border border-white/10 rounded px-4 py-2 hover:border-[var(--copper-main)]"
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[var(--copper-main)] text-white text-[9px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {!loading && (
              <p className="text-xs text-[var(--text-muted)]">
                {products.length} products
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Sort */}
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((f) => ({ ...f, sortBy: e.target.value as FilterState['sortBy'] }))
              }
              className="h-9 px-3 bg-white/5 border border-white/10 rounded text-xs text-[var(--text-muted)] focus:outline-none focus:border-[var(--copper-main)] cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[var(--bg-dark)]">
                  {opt.label}
                </option>
              ))}
            </select>

            {/* View toggle */}
            <div className="hidden md:flex border border-white/10 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`w-9 h-9 flex items-center justify-center transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[var(--copper-main)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--copper-light)]'
                }`}
                aria-label="Grid view"
              >
                <Grid3X3 size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`w-9 h-9 flex items-center justify-center transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--copper-main)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--copper-light)]'
                }`}
                aria-label="List view"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {filters.category.map((c) => (
              <span
                key={c}
                className="flex items-center gap-1.5 px-3 py-1 bg-[var(--copper-main)]/10 border border-[var(--copper-main)]/20 rounded-full text-xs text-[var(--copper-light)]"
              >
                {c}
                <button
                  onClick={() =>
                    setFilters((f) => ({ ...f, category: f.category.filter((x) => x !== c) }))
                  }
                  aria-label={`Remove ${c} filter`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Product Grid */}
        {loading ? (
          <div
            className={`grid gap-4 md:gap-6 ${
              viewMode === 'grid'
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--text-muted)] mb-4">No products found</p>
            <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <motion.div
            layout
            className={`grid gap-4 md:gap-6 ${
              viewMode === 'grid'
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {products.map((product, i) => (
              <motion.div
                key={product.productId}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ProductCard product={product} priority={i < 8} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="mt-12 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => loadProducts(false)}
            >
              Load More
            </Button>
          </div>
        )}
      </div>

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        gender={gender}
      />
    </div>
  );
}
