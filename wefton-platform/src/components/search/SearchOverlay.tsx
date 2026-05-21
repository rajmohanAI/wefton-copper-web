'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { useSearchStore } from '@/store/searchStore';
import { searchProducts } from '@/services/productService';
import { formatPrice, debounce } from '@/lib/utils';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Product } from '@/types';

// Fallback trending terms if Firestore search_config is unavailable
const FALLBACK_TRENDING = ['Premium Tee', 'Oversized', 'Active Wear', 'Hoodies', 'Co-Ords'];

export default function SearchOverlay() {
  const { isOpen, query, setQuery, closeSearch, history, addToHistory, clearHistory } =
    useSearchStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [trending, setTrending] = useState<string[]>(FALLBACK_TRENDING);

  // Fetch trending terms from Firestore search_config on mount
  useEffect(() => {
    async function fetchTrending() {
      try {
        const db = getFirebaseDb();
        if (!db) return;
        const configDoc = await getDoc(doc(db, 'search_config', 'trending'));
        if (configDoc.exists()) {
          const data = configDoc.data();
          if (Array.isArray(data.terms) && data.terms.length > 0) {
            setTrending(data.terms);
          }
        }
      } catch {
        // Silently fall back to default trending terms
      }
    }
    fetchTrending();
  }, []);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setHasSearched(false);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useSearchStore.getState().openSearch();
      }
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeSearch]);

  // Debounced search — 300ms as per requirement 32.2
  const doSearch = useMemo(
    () => debounce(async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        setHasSearched(false);
        return;
      }
      setLoading(true);
      try {
        const res = await searchProducts(q);
        setResults(res);
        setHasSearched(true);
      } catch {
        setResults([]);
        setHasSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const handleChange = (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setHasSearched(false);
    }
    doSearch(val);
  };

  const handleResultClick = (product: Product) => {
    addToHistory(query);
    closeSearch();
    router.push(`/products/${product.slug}`);
  };

  const handleSubmit = () => {
    if (!query.trim()) return;
    addToHistory(query);
    closeSearch();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleTrendingClick = (term: string) => {
    setQuery(term);
    doSearch(term);
  };

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    doSearch(term);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — closes on click (outside click) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
            onClick={closeSearch}
            aria-hidden="true"
          />

          {/* Search Panel */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--glass-border)]"
            role="dialog"
            aria-modal="true"
            aria-label="Search products"
          >
            {/* Search Input */}
            <div className="max-w-3xl mx-auto px-6 py-5">
              <div className="flex items-center gap-4">
                <Search size={20} className="text-[var(--copper-light)] flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => handleChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmit();
                    }
                  }}
                  placeholder="Search products, categories…"
                  className="flex-1 bg-transparent text-lg text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none"
                  aria-label="Search"
                />
                <button
                  onClick={closeSearch}
                  className="text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors"
                  aria-label="Close search"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Results / Suggestions */}
              <div className="mt-4 pb-4 max-h-[70vh] overflow-y-auto">
                {/* Loading state */}
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-4">
                    <span className="h-4 w-4 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
                    Searching…
                  </div>
                )}

                {/* Results — up to 20 as per requirement 32.3 */}
                {!loading && query.trim() && results.length > 0 && (
                  <div>
                    <p className="text-xs tracking-widest uppercase text-[var(--text-muted)] mb-3">
                      {results.length} {results.length === 1 ? 'Result' : 'Results'}
                    </p>
                    <div className="space-y-1">
                      {results.slice(0, 20).map((product) => (
                        <button
                          key={product.productId}
                          onClick={() => handleResultClick(product)}
                          className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group w-full text-left"
                        >
                          <div className="relative w-12 h-14 rounded overflow-hidden bg-[var(--bg-darker)] flex-shrink-0">
                            {product.images?.[0] && (
                              <Image
                                src={product.images[0].url}
                                alt={product.images[0].alt || product.title}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[var(--text-light)] group-hover:text-[var(--copper-light)] transition-colors truncate">
                              {product.title}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">{product.category}</p>
                          </div>
                          <p className="text-sm text-[var(--copper-light)] flex-shrink-0">
                            {formatPrice(product.price)}
                          </p>
                          <ArrowRight
                            size={14}
                            className="text-[var(--text-faint)] group-hover:text-[var(--copper-light)] transition-colors"
                          />
                        </button>
                      ))}
                    </div>
                    {/* View all results link */}
                    {results.length > 6 && (
                      <button
                        onClick={handleSubmit}
                        className="block mt-3 text-xs text-center text-[var(--copper-light)] hover:underline w-full"
                      >
                        View all {results.length} results →
                      </button>
                    )}
                  </div>
                )}

                {/* No results — with collection suggestions (requirement 32.7) */}
                {!loading && hasSearched && query.trim() && results.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                      No products found for &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-xs text-[var(--text-faint)] mb-3">
                      Try browsing our collections:
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <Link
                        href="/men"
                        onClick={closeSearch}
                        className="px-4 py-2 text-xs bg-white/5 border border-white/10 rounded-full text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:border-[var(--copper-main)] transition-colors"
                      >
                        Men&apos;s Collection
                      </Link>
                      <Link
                        href="/women"
                        onClick={closeSearch}
                        className="px-4 py-2 text-xs bg-white/5 border border-white/10 rounded-full text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:border-[var(--copper-main)] transition-colors"
                      >
                        Women&apos;s Collection
                      </Link>
                      <Link
                        href="/new-arrivals"
                        onClick={closeSearch}
                        className="px-4 py-2 text-xs bg-white/5 border border-white/10 rounded-full text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:border-[var(--copper-main)] transition-colors"
                      >
                        New Arrivals
                      </Link>
                    </div>
                  </div>
                )}

                {/* Empty query state — history + trending (requirement 32.4) */}
                {!query.trim() && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Trending terms */}
                    <div>
                      <p className="text-xs tracking-widest uppercase text-[var(--text-muted)] mb-3 flex items-center gap-2">
                        <TrendingUp size={12} /> Trending
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {trending.map((t) => (
                          <button
                            key={t}
                            onClick={() => handleTrendingClick(t)}
                            className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-full text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:border-[var(--copper-main)] transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Recent search history (max 5 from searchStore) */}
                    {history.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs tracking-widest uppercase text-[var(--text-muted)] flex items-center gap-2">
                            <Clock size={12} /> Recent
                          </p>
                          <button
                            onClick={clearHistory}
                            className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="space-y-1">
                          {history.map((h) => (
                            <button
                              key={h}
                              onClick={() => handleHistoryClick(h)}
                              className="flex items-center gap-2 w-full text-left text-sm text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors py-1"
                            >
                              <Clock size={12} className="flex-shrink-0" />
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
