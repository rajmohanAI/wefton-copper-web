// ============================================================
// Wefton Copper — Order pricing
// One formula for the cart, the Firestore order and the server-side
// payment check, so the amount charged always matches what was shown.
// ============================================================
import { SHIPPING_COST, FREE_SHIPPING_THRESHOLD, TAX_RATE, PRICES_INCLUDE_GST } from '@/config/brand';

export interface PricedLine {
  price: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  discountAmount: number;
  shipping: number;
  /** Tax added on top of the prices; 0 while prices include GST. */
  taxes: number;
  total: number;
}

/**
 * @param discountPercent coupon discount in percent (0–100)
 * @param discountFlat coupon discount in rupees; never more than the subtotal
 */
export function computeOrderTotals(lines: PricedLine[], discountPercent = 0, discountFlat = 0): OrderTotals {
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const discountAmount = discountFlat > 0 ? Math.min(discountFlat, subtotal) : (subtotal * discountPercent) / 100;
  const shipping = SHIPPING_COST > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_COST : 0;
  const taxes = PRICES_INCLUDE_GST ? 0 : Math.round((subtotal - discountAmount) * TAX_RATE);
  const total = subtotal - discountAmount + shipping + taxes;
  return { subtotal, discountAmount, shipping, taxes, total };
}
