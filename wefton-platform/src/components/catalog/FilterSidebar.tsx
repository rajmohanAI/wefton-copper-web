'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import * as Checkbox from '@radix-ui/react-checkbox';
import { MEN_CATEGORIES, WOMEN_CATEGORIES } from '@/config/brand';
import type { FilterState } from '@/types';
import Button from '@/components/ui/Button';

interface FilterSidebarInlineProps {
  mode: 'inline';
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  gender: 'men' | 'women';
  isOpen?: never;
  onClose?: never;
}

interface FilterSidebarDrawerProps {
  mode: 'drawer';
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  gender: 'men' | 'women';
}

type FilterSidebarProps = FilterSidebarInlineProps | FilterSidebarDrawerProps;

function FilterContent({
  filters,
  onChange,
  gender,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  gender: 'men' | 'women';
}) {
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
    <div className="space-y-8">
      {/* Category Multi-Select */}
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
              <Checkbox.Root
                checked={filters.category.includes(cat.slug)}
                onCheckedChange={() => toggleCategory(cat.slug)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  filters.category.includes(cat.slug)
                    ? 'bg-[var(--copper-main)] border-[var(--copper-main)]'
                    : 'border-white/20 group-hover:border-[var(--copper-main)]'
                }`}
              >
                <Checkbox.Indicator>
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path
                      d="M1 3L3 5L7 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span
                className={`text-sm transition-colors ${
                  filters.category.includes(cat.slug)
                    ? 'text-[var(--copper-light)]'
                    : 'text-[var(--text-muted)] group-hover:text-[var(--text-light)]'
                }`}
              >
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Slider (Radix UI) */}
      <div>
        <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Price Range
        </h3>
        <div className="space-y-4">
          <Slider.Root
            className="relative flex items-center select-none touch-none w-full h-5"
            value={filters.priceRange}
            onValueChange={(value) =>
              update({ priceRange: [value[0], value[1]] })
            }
            min={0}
            max={5000}
            step={100}
            minStepsBetweenThumbs={1}
          >
            <Slider.Track className="bg-white/10 relative grow rounded-full h-[3px]">
              <Slider.Range className="absolute bg-[var(--copper-main)] rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb
              className="block w-4 h-4 bg-[var(--copper-light)] rounded-full border-2 border-[var(--copper-main)] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--copper-main)] transition-colors"
              aria-label="Minimum price"
            />
            <Slider.Thumb
              className="block w-4 h-4 bg-[var(--copper-light)] rounded-full border-2 border-[var(--copper-main)] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--copper-main)] transition-colors"
              aria-label="Maximum price"
            />
          </Slider.Root>
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>₹{filters.priceRange[0]}</span>
            <span>₹{filters.priceRange[1]}</span>
          </div>
        </div>
      </div>

      {/* Minimum Rating */}
      <div>
        <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Minimum Rating
        </h3>
        <div className="flex gap-2 flex-wrap">
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

      {/* Toggles: Availability, New Arrivals, Bestsellers */}
      <div>
        <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
          Options
        </h3>
        <div className="space-y-3">
          {[
            { key: 'availability' as const, label: 'In Stock Only' },
            { key: 'newArrivals' as const, label: 'New Arrivals' },
            { key: 'bestsellers' as const, label: 'Bestsellers' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-[var(--text-muted)]">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={!!filters[key]}
                onClick={() => update({ [key]: !filters[key] })}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  filters[key] ? 'bg-[var(--copper-main)]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    filters[key] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FilterSidebar(props: FilterSidebarProps) {
  const { mode, filters, onChange, gender } = props;

  const handleReset = () => {
    onChange({
      category: [],
      gender: [],
      priceRange: [0, 5000],
      rating: 0,
      availability: false,
      newArrivals: false,
      bestsellers: false,
      sortBy: 'newest',
    });
  };

  // Inline mode: render filter content directly (used inside desktop sidebar)
  if (mode === 'inline') {
    return <FilterContent filters={filters} onChange={onChange} gender={gender} />;
  }

  // Drawer mode: mobile slide-over
  const { isOpen, onClose } = props;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-[var(--bg-dark)] border-r border-[var(--border-subtle)] flex flex-col lg:hidden"
            role="dialog"
            aria-label="Filters"
            aria-modal="true"
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

            {/* Scrollable Filter Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <FilterContent filters={filters} onChange={onChange} gender={gender} />
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-5 border-t border-[var(--border-subtle)] flex gap-3">
              <Button variant="secondary" fullWidth onClick={handleReset}>
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
