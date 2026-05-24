'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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

/**
 * Parse filter state from URL search params.
 */
function parseFiltersFromParams(params: URLSearchParams): Partial<FilterState> {
  const parsed: Partial<FilterState> = {};

  const category = params.get('category');
  if (category) parsed.category = category.split(',');

  const priceMin = params.get('priceMin');
  const priceMax = params.get('priceMax');
  if (priceMin || priceMax) {
    parsed.priceRange = [
      priceMin ? parseInt(priceMin, 10) : 0,
      priceMax ? parseInt(priceMax, 10) : 5000,
    ];
  }

  const rating = params.get('rating');
  if (rating) parsed.rating = parseInt(rating, 10);

  if (params.get('availability') === 'true') parsed.availability = true;
  if (params.get('newArrivals') === 'true') parsed.newArrivals = true;
  if (params.get('bestsellers') === 'true') parsed.bestsellers = true;

  const sortBy = params.get('sortBy');
  if (sortBy && ['newest', 'price-asc', 'price-desc', 'rating', 'bestseller'].includes(sortBy)) {
    parsed.sortBy = sortBy as FilterState['sortBy'];
  }

  return parsed;
}

/**
 * Serialize filter state to URL search params (only non-default values).
 */
function serializeFiltersToParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.category.length > 0) params.set('category', filters.category.join(','));
  if (filters.priceRange[0] > 0) params.set('priceMin', String(filters.priceRange[0]));
  if (filters.priceRange[1] < 5000) params.set('priceMax', String(filters.priceRange[1]));
  if (filters.rating > 0) params.set('rating', String(filters.rating));
  if (filters.availability) params.set('availability', 'true');
  if (filters.newArrivals) params.set('newArrivals', 'true');
  if (filters.bestsellers) params.set('bestsellers', 'true');
  if (filters.sortBy !== 'newest') params.set('sortBy', filters.sortBy);

  return params;
}

/**
 * Count active (non-default) filters for badge display.
 */
function getActiveFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.category.length > 0) count++;
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 5000) count++;
  if (filters.rating > 0) count++;
  if (filters.availability) count++;
  if (filters.newArrivals) count++;
  if (filters.bestsellers) count++;
  if (filters.sortBy !== 'newest') count++;
  return count;
}

export default function CollectionPage({ gender, title, subtitle }: CollectionPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize filters from URL params
  const [filters, setFilters] = useState<FilterState>(() => {
    const fromParams = parseFiltersFromParams(searchParams);
    return { ...DEFAULT_FILTERS, ...fromParams };
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [lastDoc, setLastDoc] = useState<unknown>(null);

  // Refs for infinite scroll and debounce
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const categories = gender === 'men' ? MEN_CATEGORIES : WOMEN_CATEGORIES;
  const activeFilterCount = getActiveFilterCount(filters);

  // Sync filters to URL params (skip initial mount to avoid double-load)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const params = serializeFiltersToParams(filters);
    const paramString = params.toString();
    const newUrl = paramString ? `${pathname}?${paramString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [filters, pathname, router]);

  // Load products with debounce (reset cursor on filter/sort change)
  const loadProducts = useCallback(
    async (reset = true) => {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

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
        if (reset) setProducts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gender, filters]
  );

  // Debounced reload on filter/sort change (within 500ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setLastDoc(null);
      loadProducts(true);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [loadProducts]);

  // Infinite scroll with Intersection Observer (200px from bottom)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
          loadProducts(false);
        }
      },
      {
        rootMargin: '200px',
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadProducts]);

  // Restore scroll position on back navigation
  useEffect(() => {
    if (typeof window !== 'undefined' && window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }

    const savedScroll = sessionStorage.getItem(`scroll-${pathname}`);
    if (savedScroll && !loading) {
      const scrollY = parseInt(savedScroll, 10);
      window.scrollTo(0, scrollY);
      sessionStorage.removeItem(`scroll-${pathname}`);
    }

    const handleBeforeUnload = () => {
      sessionStorage.setItem(`scroll-${pathname}`, String(window.scrollY));
    };

    // Save scroll position when navigating away
    const handleRouteChange = () => {
      sessionStorage.setItem(`scroll-${pathname}`, String(window.scrollY));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    // Use click event on product links to save scroll before navigation
    const productLinks = document.querySelectorAll('a[href^="/products/"]');
    productLinks.forEach((link) => link.addEventListener('click', handleRouteChange));

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      productLinks.forEach((link) => link.removeEventListener('click', handleRouteChange));
    };
  }, [pathname, loading, products]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto min-h-screen pt-[var(--nav-height)]">
      {/* Page Header */}
      <div className="w-full bg-[var(--bg-darker)] border-b border-[var(--border-subtle)] pt-12 pb-10 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-light text-[var(--copper-light)]"
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

      {/* Category Pills */}
      <div className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-dark)]">
        <div className="w-full px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar">
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
                    : [...f.category, cat.slug],
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

      {/* Main Content: Sidebar + Product Grid */}
      <div className="flex w-full min-h-[calc(100vh-300px)] px-6 py-8">
        {/* Desktop Persistent FilterSidebar (≥ 1024px) */}
        <aside className="hidden lg:block w-[250px] shrink-0 pr-6 border-r border-[var(--border-subtle)]">
          <div className="sticky top-[calc(var(--nav-height)+2rem)] max-h-[calc(100vh-var(--nav-height)-4rem)] overflow-y-auto">
            <div className="pb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-medium tracking-widest uppercase text-[var(--text-light)]">
                  Filters
                </h2>
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                >
                  Reset
                </button>
              </div>
              <FilterSidebar
                mode="inline"
                filters={filters}
                onChange={handleFilterChange}
                gender={gender}
              />
            </div>
          </div>
        </aside>

        {/* Product Content Area — takes all remaining space */}
        <div className="flex-1 w-full pl-0 lg:pl-8">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                {/* Mobile Filter Button (< 1024px) */}
                <button
                  onClick={() => setFilterOpen(true)}
                  className="lg:hidden flex items-center gap-2 text-xs tracking-wider uppercase text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors border border-white/10 rounded px-4 py-2 hover:border-[var(--copper-main)]"
                >
                  <SlidersHorizontal size={14} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[var(--copper-main)] text-white text-[10px] flex items-center justify-center font-medium">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {!loading && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {products.length} product{products.length !== 1 ? 's' : ''}
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

            {/* Active Filters Tags */}
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
                {filters.availability && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-[var(--copper-main)]/10 border border-[var(--copper-main)]/20 rounded-full text-xs text-[var(--copper-light)]">
                    In Stock
                    <button
                      onClick={() => setFilters((f) => ({ ...f, availability: false }))}
                      aria-label="Remove availability filter"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
                {filters.newArrivals && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-[var(--copper-main)]/10 border border-[var(--copper-main)]/20 rounded-full text-xs text-[var(--copper-light)]">
                    New Arrivals
                    <button
                      onClick={() => setFilters((f) => ({ ...f, newArrivals: false }))}
                      aria-label="Remove new arrivals filter"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
                {filters.bestsellers && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-[var(--copper-main)]/10 border border-[var(--copper-main)]/20 rounded-full text-xs text-[var(--copper-light)]">
                    Bestsellers
                    <button
                      onClick={() => setFilters((f) => ({ ...f, bestsellers: false }))}
                      aria-label="Remove bestsellers filter"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
                {filters.rating > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-[var(--copper-main)]/10 border border-[var(--copper-main)]/20 rounded-full text-xs text-[var(--copper-light)]">
                    {filters.rating}+ Stars
                    <button
                      onClick={() => setFilters((f) => ({ ...f, rating: 0 }))}
                      aria-label="Remove rating filter"
                    >
                      <X size={10} />
                    </button>
                  </span>
                )}
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Product Grid / List */}
            {loading ? (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'
                    : 'grid grid-cols-1 gap-4'
                }
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center py-20">
                <SlidersHorizontal size={48} className="text-[var(--text-faint)] mb-4" />
                <p className="text-lg text-[var(--text-muted)]">No products found</p>
                <p className="text-sm text-[var(--text-faint)] mt-1">
                  Try adjusting your filters or clearing them to see more results.
                </p>
                <div className="mt-4">
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <motion.div
                  layout
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'
                      : 'grid grid-cols-1 gap-4'
                  }
                >
                  {products.map((product, i) => (
                    <motion.div
                      key={product.productId}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <ProductCard product={product} priority={i < 6} />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Loading more indicator */}
                {loadingMore && (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
                  </div>
                )}

                {/* Infinite scroll sentinel (200px before bottom) */}
                <div ref={sentinelRef} className="h-1" aria-hidden="true" />
              </>
            )}
          </div>
        </div>

      {/* Mobile Filter Drawer (< 1024px) */}
      <FilterSidebar
        mode="drawer"
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={handleFilterChange}
        gender={gender}
      />
    </div>
  );
}
