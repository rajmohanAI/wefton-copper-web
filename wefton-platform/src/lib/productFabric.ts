import type { Product } from '@/types';

/**
 * The product's fabric composition as the supplier specifies it. Falls back to
 * the product's own uploaded wash care guide; never to a brand-wide default,
 * so a blended or polyester product is never shown as cotton.
 */
export function productFabric(product: Pick<Product, 'fabric' | 'careGuide'>): string {
  return (product.fabric || product.careGuide?.fabric || '').trim();
}
