// ============================================================
// Wefton Copper — Order pricing
// One formula for the cart, the Firestore order and the server-side
// payment check, so the amount charged always matches what was shown.
// ============================================================
import { SHIPPING_COST, FREE_SHIPPING_THRESHOLD, TAX_RATE } from '@/config/brand';

export interface PricedLine {
  price: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  discountAmount: number;
  shipping: number;
  taxes: number;
  total: number;
}

/** @param discountPercent coupon discount in percent (0–100) */
export function computeOrderTotals(lines: PricedLine[], discountPercent = 0): OrderTotals {
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const taxes = Math.round((subtotal - discountAmount) * TAX_RATE);
  const total = subtotal - discountAmount + shipping + taxes;
  return { subtotal, discountAmount, shipping, taxes, total };
}
