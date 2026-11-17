'use client';

import type { Product } from '@/types';
import { genderLabel } from './useGuideProduct';

interface ProductPickerProps {
  products: Product[];
  value: string;
  onChange: (slug: string) => void;
  loading: boolean;
  /** Label for the "no product" option. */
  emptyLabel: string;
}

export default function ProductPicker({ products, value, onChange, loading, emptyLabel }: ProductPickerProps) {
  return (
    <div className="flex flex-col gap-1.5 max-w-md">
      <label htmlFor="guide-product" className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]">
        Product
      </label>
      <select
        id="guide-product"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading && !products.length}
        className="h-11 px-4 rounded bg-[var(--bg-card)] border border-black/15 dark:border-white/15 text-sm text-[var(--text-light)] focus:outline-none focus:border-[var(--copper-main)]"
      >
        <option value="" className="bg-[var(--bg-dark)]">
          {loading && !products.length ? 'Loading products…' : emptyLabel}
        </option>
        {products.map((p) => (
          <option key={p.productId} value={p.slug} className="bg-[var(--bg-dark)]">
            {p.title} ({genderLabel(p.gender)})
          </option>
        ))}
      </select>
    </div>
  );
}
