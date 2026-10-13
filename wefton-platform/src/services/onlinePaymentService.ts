// ============================================================
// Wefton Copper — Online payment API calls (browser)
// Talks to /api/payments/razorpay/*; the server holds the Razorpay secret.
// ============================================================
import { getFirebaseAuth } from '@/lib/firebase';
import type { RazorpaySuccessResponse } from '@/lib/razorpay/checkout';

export interface RazorpayOrderDetails {
  keyId: string;
  orderId: string;
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getFirebaseAuth()?.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in again to pay online');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || 'Payment request failed');
  return data;
}

/** True when the server has Razorpay keys configured. */
export async function isOnlinePaymentEnabled(): Promise<boolean> {
  try {
    const res = await fetch('/api/payments/razorpay/status', { cache: 'no-store' });
    if (!res.ok) return false;
    const data = (await res.json()) as { enabled?: boolean };
    return data.enabled === true;
  } catch {
    return false;
  }
}

export function createRazorpayOrder(orderId: string): Promise<RazorpayOrderDetails> {
  return postJson<RazorpayOrderDetails>('/api/payments/razorpay/order', { orderId });
}

export async function verifyRazorpayPayment(
  orderId: string,
  response: RazorpaySuccessResponse
): Promise<void> {
  await postJson('/api/payments/razorpay/verify', { orderId, ...response });
}
