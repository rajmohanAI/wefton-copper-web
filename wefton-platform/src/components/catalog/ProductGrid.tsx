import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * ProductGrid — CSS grid for product cards (V2 spec, Req 3.3/3.4).
 * 2 columns on phones, then `repeat(auto-fill, minmax(min(100%, 280px), 1fr))`
 * from 768px up. Cards are spaced with `gap` only; the `.product-grid`
 * rule lives in src/styles/globals.css.
 */
export default function ProductGrid({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('product-grid', className)} {...props} />;
}
