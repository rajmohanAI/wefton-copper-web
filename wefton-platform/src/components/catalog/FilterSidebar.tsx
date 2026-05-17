'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { MEN_CATEGORIES, WOMEN_CATEGORIES } from '@/config/brand';
import type { FilterState } from '@/types';
import Button from '@/components/ui/Button';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  gender: 'men' | 'women';
}

export default function FilterSidebar({
  isOpen,
  onClose,
  filters,
  onChange,
  gender,
}: FilterSidebarProps) {
  const categories = gender === 'men' ? MEN_CATEGORIES : WOMEN_CATEGORIES;

  const update = (partial: Partial<FilterState>) =>
    onChange({ ...filters, ...partial });

  const toggleCategory = (slug: string) => {
    const next = filters.category.includes(slug)
      ? filters.category.filter((c) => c !== slug)
      : [...filters.category, slug];
    update({ category: next });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-80 glass border-r border-[var(--glass-border)] flex flex-col"
            role="dialog"
            aria-label="Filters"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)]">
              <h2 className="text-sm font-medium tracking-widest uppercase text-[var(--text-light)]">
                Filters
              </h2>
              <button
                onClick={onClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filters */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Category */}
              <div>
                <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
                  Category
                </h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          filters.category.includes(cat.slug)
                            ? 'bg-[var(--copper-main)] border-[var(--copper-main)]'
                            : 'border-white/20 group-hover:border-[var(--copper-main)]'
                        }`}
                        onClick={() => toggleCategory(cat.slug)}
                      >
                        {filters.category.includes(cat.slug) && (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span
                        className={`text-sm transition-colors ${
                          filters.category.includes(cat.slug)
                            ? 'text-[var(--copper-light)]'
                            : 'text-[var(--text-muted)] group-hover:text-[var(--text-light)]'
                        }`}
                        onClick={() => toggleCategory(cat.slug)}
                      >
                        {cat.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
                  Price Range
                </h3>
                <div className="space-y-3">
                  <input
                    type="range"
                    min={0}
                    max={5000}
                    step={100}
                    value={filters.priceRange[1]}
                    onChange={(e) =>
                      update({ priceRange: [filters.priceRange[0], Number(e.target.value)] })
                    }
                    className="w-full accent-[var(--copper-main)]"
                  />
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>₹{filters.priceRange[0]}</span>
                    <span>₹{filters.priceRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Rating */}
              <div>
                <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
                  Minimum Rating
                </h3>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => update({ rating: filters.rating === r ? 0 : r })}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded border text-xs transition-colors ${
                        filters.rating === r
                          ? 'bg-[var(--copper-main)] border-[var(--copper-main)] text-white'
                          : 'border-white/10 text-[var(--text-muted)] hover:border-[var(--copper-main)]'
                      }`}
                    >
                      <Star size={10} fill={filters.rating >= r ? 'currentColor' : 'none'} />
                      {r}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div>
                <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
                  Availability
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'availability', label: 'In Stock Only' },
                    { key: 'newArrivals', label: 'New Arrivals' },
                    { key: 'bestsellers', label: 'Bestsellers' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-[var(--text-muted)]">{label}</span>
                      <div
                        onClick={() => update({ [key]: !filters[key as keyof FilterState] })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          filters[key as keyof FilterState]
                            ? 'bg-[var(--copper-main)]'
                            : 'bg-white/10'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            filters[key as keyof FilterState] ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-[var(--border-subtle)] flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() =>
                  onChange({
                    category: [],
                    gender: [],
                    priceRange: [0, 5000],
                    rating: 0,
                    availability: false,
                    newArrivals: false,
                    bestsellers: false,
                    sortBy: 'newest',
                  })
                }
              >
                Reset
              </Button>
              <Button variant="copper" fullWidth onClick={onClose}>
                Apply
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
