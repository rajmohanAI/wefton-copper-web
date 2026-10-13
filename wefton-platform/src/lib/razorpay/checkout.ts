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
