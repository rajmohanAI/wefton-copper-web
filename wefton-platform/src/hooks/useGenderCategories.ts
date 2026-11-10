'use client';

import { useEffect, useState } from 'react';
import { getCategoriesByGender, type NavCategory } from '@/services/categoryService';

/** Categories that have products for a gender (empty while loading or when there are none). */
export function useGenderCategories(gender: 'men' | 'women'): NavCategory[] {
  const [categories, setCategories] = useState<NavCategory[]>([]);
  useEffect(() => {
    let cancelled = false;
    getCategoriesByGender(gender)
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch(() => {
        /* no categories: the filters just don't show any */
      });
    return () => {
      cancelled = true;
    };
  }, [gender]);
  return categories;
}
