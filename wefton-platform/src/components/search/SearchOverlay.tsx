'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { useSearchStore } from '@/store/searchStore';
import { searchProducts } from '@/services/productService';
import { formatPrice, debounce } from '@/lib/utils';
import type { Product } from '@/types';

const TRENDING = ['Premium Tee', 'Oversized', 'Active Wear', 'Hoodies', 'Co-Ords'];

export default function SearchOverlay() {
  const { isOpen, query, setQuery, closeSearch, history, addToHistory, clearHistory } =
    useSearchStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setResults([]);
    }
  }, [isOpen]);

  // Keyboard shortcut
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doSearch = useCallback(
    debounce(async (q: string) => {
      if (!q.trim()) { setResults([]); setLoading(false); return; }
      setLoading(true);
      try {
        const res = await searchProducts(q);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350),
    []
  );

  const handleChange = (val: string) => {
    setQuery(val);
    doSearch(val);
  };

  const handleSelect = (q: string) => {
    addToHistory(q);
    closeSearch();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
            onClick={closeSearch}
          />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--glass-border)]"
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
                    if (e.key === 'Enter' && query.trim()) {
                      handleSelect(query);
                      router.push(`/search?q=${encodeURIComponent(query)}`);
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
              <div className="mt-4 pb-4 max-h-[60vh] overflow-y-auto">
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-4">
                    <span className="h-4 w-4 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
                    Searching…
                  </div>
                )}

                {!loading && query && results.length > 0 && (
                  <div>
                    <p className="text-xs tracking-widest uppercase text-[var(--text-muted)] mb-3">
                      Results
                    </p>
                    <div className="space-y-2">
                      {results.slice(0, 6).map((product) => (
                        <Link
                          key={product.productId}
                          href={`/products/${product.slug}`}
                          onClick={() => handleSelect(query)}
                          className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                        >
                          <div className="relative w-12 h-14 rounded overflow-hidden bg-[var(--bg-darker)] flex-shrink-0">
                            {product.images?.[0] && (
                              <Image
                                src={product.images[0].url}
                                alt={product.title}
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
                          <ArrowRight size={14} className="text-[var(--text-faint)] group-hover:text-[var(--copper-light)] transition-colors" />
                        </Link>
                      ))}
                    </div>
                    {results.length > 6 && (
                      <Link
                        href={`/search?q=${encodeURIComponent(query)}`}
                        onClick={() => handleSelect(query)}
                        className="block mt-3 text-xs text-center text-[var(--copper-light)] hover:underline"
                      >
                        View all {results.length} results
                      </Link>
                    )}
                  </div>
                )}

                {!loading && query && results.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)] py-4">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                )}

                {!query && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Trending */}
                    <div>
                      <p className="text-xs tracking-widest uppercase text-[var(--text-muted)] mb-3 flex items-center gap-2">
                        <TrendingUp size={12} /> Trending
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {TRENDING.map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              setQuery(t);
                              doSearch(t);
                            }}
                            className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-full text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:border-[var(--copper-main)] transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* History */}
                    {history.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs tracking-widest uppercase text-[var(--text-muted)] flex items-center gap-2">
                            <Clock size={12} /> Recent
                          </p>
                          <button
                            onClick={clearHistory}
                            className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="space-y-1">
                          {history.map((h) => (
                            <button
                              key={h}
                              onClick={() => {
                                setQuery(h);
                                doSearch(h);
                              }}
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
