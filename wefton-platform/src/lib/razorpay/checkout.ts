// ============================================================
// Wefton Copper — Razorpay Checkout (browser)
// Loads checkout.js and opens the payment modal for an order the server
// has already created. Holds no secrets: the key id comes from the server.
// ============================================================

export const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailureResponse {
  error: {
    code?: string;
    description?: string;
    reason?: string;
    metadata?: { order_id?: string; payment_id?: string };
  };
}

/** Methods the payment step offers; Checkout opens on the one picked. */
export type PaymentMethodChoice = 'upi' | 'card' | 'netbanking';

interface RazorpayDisplayConfig {
  display: {
    blocks: Record<string, { name: string; instruments: { method: string }[] }>;
    sequence: string[];
    preferences: { show_default_blocks: boolean };
  };
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  config?: RazorpayDisplayConfig;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', cb: (response: RazorpayFailureResponse) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

const METHOD_BLOCK_NAMES: Record<PaymentMethodChoice, string> = {
  upi: 'Pay using UPI',
  card: 'Pay using credit or debit card',
  netbanking: 'Pay using netbanking',
};

/**
 * Checkout display config that lists the chosen method first. The other
 * methods enabled on the account stay available below it, so the customer
 * can still switch inside Checkout.
 * Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/configure-payment-methods/
 */
export function displayConfigFor(method: PaymentMethodChoice): RazorpayDisplayConfig {
  return {
    display: {
      blocks: {
        chosen: { name: METHOD_BLOCK_NAMES[method], instruments: [{ method }] },
      },
      sequence: ['block.chosen'],
      preferences: { show_default_blocks: true },
    },
  };
}

let scriptPromise: Promise<boolean> | null = null;

/** Loads checkout.js once. Resolves false if it cannot be loaded. */
export function loadRazorpayCheckout(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      scriptPromise = null; // allow a retry
      script.remove();
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export function openRazorpayCheckout(
  options: RazorpayCheckoutOptions,
  onFailure: (response: RazorpayFailureResponse) => void
): void {
  if (!window.Razorpay) throw new Error('Razorpay Checkout is not loaded');
  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', onFailure);
  rzp.open();
}
