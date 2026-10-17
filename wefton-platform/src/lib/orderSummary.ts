import type { Order } from '@/types';

/** "WCPM001 × 2, WCPW003 × 1"; lines without a Product ID fall back to the title. */
export function itemsSummary(order: Pick<Order, 'products'>): string {
  return (order.products || [])
    .map((i) => `${i.productCode || i.title} × ${i.quantity}`)
    .join(', ');
}
