/**
 * GA4 Event Helper Functions
 *
 * Provides typed helper functions for dispatching Google Analytics 4 events.
 * All helpers guard against SSR and missing gtag by checking window.gtag existence.
 */

type GA4EventParams = Record<string, string | number | object[]>;

/**
 * Generic GA4 event dispatcher.
 * Only fires when `window.gtag` exists (i.e., GA4 script is loaded and consent granted).
 */
export function trackEvent(eventName: string, params: GA4EventParams): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

/**
 * Tracks an `add_to_cart` GA4 event.
 * Fires when a customer adds a product to the cart.
 *
 * @param item - The product item being added to cart
 */
export function trackAddToCart(item: {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}): void {
  trackEvent('add_to_cart', {
    currency: 'INR',
    items: [item],
    value: item.price * item.quantity,
  });
}

/**
 * Tracks a `purchase` GA4 event.
 * Fires when a customer completes checkout.
 *
 * @param order - The order details including transaction ID, value, shipping, and items
 */
export function trackPurchase(order: {
  transaction_id: string;
  value: number;
  shipping: number;
  items: { item_id: string; item_name: string; price: number; quantity: number }[];
}): void {
  trackEvent('purchase', {
    transaction_id: order.transaction_id,
    value: order.value,
    currency: 'INR',
    shipping: order.shipping,
    items: order.items,
  });
}

/**
 * Tracks a `view_item` GA4 event.
 * Fires when a customer views a product detail page.
 *
 * @param item - The product item being viewed
 */
export function trackViewItem(item: {
  item_id: string;
  item_name: string;
  price: number;
}): void {
  trackEvent('view_item', {
    currency: 'INR',
    items: [item],
    value: item.price,
  });
}
