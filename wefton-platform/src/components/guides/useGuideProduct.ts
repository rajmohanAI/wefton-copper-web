'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { getGuideProducts } from '@/services/productService';
import type { Product } from '@/types';

/**
 * Products for the Size Guide / Wash Care pickers, and the one chosen via
 * `?product=<slug>` (WC-Issue-7, WC-Issue-11).
 */
export function useGuideProduct() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const slug = params.get('product') || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getGuideProducts()
      .then((list) => !cancelled && setProducts(list))
      .catch(() => {
        /* Firebase unavailable: the standard guide still shows */
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(() => products.find((p) => p.slug === slug) ?? null, [products, slug]);

  const select = (nextSlug: string) => {
    router.replace(nextSlug ? `${pathname}?product=${encodeURIComponent(nextSlug)}` : pathname, { scroll: false });
  };

  return { products, loading, selected, select, slug };
}

export function genderLabel(gender: Product['gender']): string {
  return gender === 'men' ? 'Men' : gender === 'women' ? 'Women' : 'Unisex';
}
