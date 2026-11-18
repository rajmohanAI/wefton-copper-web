// ============================================================
// Wefton Copper — Wheez, the support chatbot (WC-Issue-13)
// Shared rules for the chat widget and its API routes. Wheez is guided:
// the customer picks options; free text is only asked for where a request
// needs a description (complaint, suggestion, error report, return note).
// ============================================================
import { z } from 'zod';

export const WHEEZ_NAME = 'Wheez';

/** Requests turned around in this many business days (returns only). */
export const RETURN_PROCESSING_DAYS = '5–7';
/** Return window after delivery (Return Policy, WC-Issue-6). */
export const RETURN_WINDOW_DAYS = 7;

export const MAX_IMAGES = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DETAILS = 1000;

export const WHEEZ_INTENTS = [
  { value: 'order_status', label: 'Check my order status' },
  { value: 'return', label: 'Return or replacement' },
  { value: 'review', label: 'Review a product' },
  { value: 'complaint', label: 'Complaint or feedback' },
  { value: 'suggestion', label: 'Share a suggestion' },
  { value: 'report', label: 'Report an error or inappropriate content' },
  { value: 'other', label: 'Something else' },
] as const;
export type WheezIntent = (typeof WHEEZ_INTENTS)[number]['value'];

/** Request types saved to `support_requests` (source "wheez"). */
export const WHEEZ_REQUEST_TYPES = ['return', 'complaint', 'suggestion', 'report'] as const;
export type WheezRequestType = (typeof WHEEZ_REQUEST_TYPES)[number];

/** The only reasons the Return Policy accepts (WC-Issue-6). */
export const RETURN_REASONS = [
  { value: 'wrong_size', label: 'I received the wrong size' },
  { value: 'wrong_gender', label: "I received the other gender's fit" },
  { value: 'wrong_color', label: 'I received a different colour' },
  { value: 'damaged_product', label: 'The product arrived damaged' },
  { value: 'damaged_package', label: 'The package and the product were damaged' },
  { value: 'wrong_item', label: 'I received something other than my product' },
] as const;
export type ReturnReasonValue = (typeof RETURN_REASONS)[number]['value'];

export const RETURN_OUTCOMES = [
  { value: 'replacement', label: 'Replacement' },
  { value: 'refund', label: 'Refund' },
] as const;

export const COMPLAINT_TOPICS = [
  { value: 'product', label: 'Product quality' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'payment', label: 'Payment' },
  { value: 'service', label: 'Customer service' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Something else' },
] as const;

export const SUGGESTION_TOPICS = [
  { value: 'products', label: 'New products or colours' },
  { value: 'sizing', label: 'Sizes and fit' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Something else' },
] as const;

export const REPORT_TOPICS = [
  { value: 'broken', label: 'Something is broken or not working' },
  { value: 'wrong_info', label: 'Wrong or outdated information' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Something else' },
] as const;

export function labelFor(list: readonly { value: string; label: string }[], value: string): string {
  return list.find((o) => o.value === value)?.label ?? value;
}

// ── Request IDs ───────────────────────────────────────────────

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

/** A short request ID the customer can quote, e.g. WZ-261118-K7QM. */
export function newRequestId(now: Date = new Date(), random: () => number = Math.random): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // India time
  const yymmdd =
    String(ist.getUTCFullYear()).slice(2) +
    String(ist.getUTCMonth() + 1).padStart(2, '0') +
    String(ist.getUTCDate()).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += ID_CHARS[Math.floor(random() * ID_CHARS.length)];
  return `WZ-${yymmdd}-${suffix}`;
}

export const REQUEST_ID_PATTERN = /^WZ-\d{6}-[A-Z2-9]{4}$/;

// ── Orders ────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<string, string> = {
  placed: 'Placed, waiting for payment confirmation',
  confirmed: 'Confirmed',
  processing: 'Being packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  closed: 'Completed',
  cancelled: 'Cancelled',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

/** Reads an ISO string, a Date or a Firestore Timestamp (client or Admin SDK). */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object') {
    const v = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof v.toDate === 'function') return v.toDate();
    const s = v.seconds ?? v._seconds;
    if (typeof s === 'number') return new Date(s * 1000);
  }
  return null;
}

interface OrderLike {
  orderStatus?: string;
  statusHistory?: { status: string; at: string }[];
  statusUpdatedAt?: unknown;
  updatedAt?: unknown;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: { phone?: string } | null;
}

/** When the order was delivered, or null if it has not been. */
export function deliveredAt(order: OrderLike): Date | null {
  const event = [...(order.statusHistory || [])].reverse().find((e) => e.status === 'delivered');
  if (event) return toDate(event.at);
  if (order.orderStatus === 'delivered') return toDate(order.statusUpdatedAt) ?? toDate(order.updatedAt);
  return null;
}

export type ReturnWindow = 'open' | 'not_delivered' | 'expired' | 'cancelled';

/** Whether a return can be raised for this order now. */
export function returnWindow(order: OrderLike, now: Date = new Date()): ReturnWindow {
  if (order.orderStatus === 'cancelled') return 'cancelled';
  const delivered = deliveredAt(order);
  if (!delivered) return 'not_delivered';
  const days = (now.getTime() - delivered.getTime()) / (24 * 60 * 60 * 1000);
  return days <= RETURN_WINDOW_DAYS ? 'open' : 'expired';
}

/** What Wheez shows about an order. Nothing about payment or the address. */
export interface WheezOrderSummary {
  orderId: string;
  status: string;
  statusLabel: string;
  placedAt: string | null;
  deliveredAt: string | null;
  trackingNumber: string;
  items: { title: string; size: string; color: string; quantity: number; productId: string }[];
  returnWindow: ReturnWindow;
}

const digits = (s: string) => s.replace(/\D/g, '');

/**
 * Guests prove an order is theirs with the email or phone used for it.
 * Phones match on the last 10 digits, so +91 / spaces do not matter.
 */
export function contactMatchesOrder(order: OrderLike, contact: string): boolean {
  const c = contact.trim().toLowerCase();
  if (!c) return false;
  if (c.includes('@')) return !!order.customerEmail && order.customerEmail.trim().toLowerCase() === c;
  const want = digits(c).slice(-10);
  if (want.length < 10) return false;
  return [order.customerPhone, order.shippingAddress?.phone]
    .filter((p): p is string => !!p)
    .some((p) => digits(p).slice(-10) === want);
}

// ── API payloads ──────────────────────────────────────────────

export const orderLookupSchema = z.object({
  orderId: z.string().trim().max(60).optional().or(z.literal('')),
  contact: z.string().trim().max(120).optional().or(z.literal('')),
});

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const wheezRequestSchema = z
  .object({
    type: z.enum(WHEEZ_REQUEST_TYPES),
    /** Topic for complaint / suggestion / report; return reason for returns. */
    topic: z.string().trim().min(1, 'Please pick an option').max(40),
    outcome: z.enum(['replacement', 'refund']).optional(),
    orderId: optionalText(60),
    contact: optionalText(120),
    /** Indexes of the order lines being returned. */
    items: z.array(z.number().int().min(0).max(50)).max(50).optional(),
    details: optionalText(MAX_DETAILS),
    pageUrl: optionalText(300),
    name: optionalText(80),
    email: z.string().trim().email('Please enter a valid email address').max(120).optional().or(z.literal('')),
    /** Honeypot: real visitors never see or fill this field. */
    website: z.string().max(0).optional().or(z.literal('')),
  })
  .superRefine((d, ctx) => {
    if (d.type === 'return') {
      if (!RETURN_REASONS.some((r) => r.value === d.topic)) {
        ctx.addIssue({ code: 'custom', path: ['topic'], message: 'Please pick a return reason' });
      }
      if (!d.orderId) ctx.addIssue({ code: 'custom', path: ['orderId'], message: 'Order number is required' });
      if (!d.outcome) ctx.addIssue({ code: 'custom', path: ['outcome'], message: 'Please pick replacement or refund' });
      if (!d.items?.length) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Please pick the items' });
    } else if (!d.details || d.details.length < 10) {
      ctx.addIssue({ code: 'custom', path: ['details'], message: 'Please tell us a little more (at least 10 characters)' });
    }
  });

export type WheezRequestInput = z.infer<typeof wheezRequestSchema>;

/** The reply Wheez shows once a request is saved. */
export function confirmationMessage(type: WheezRequestType, requestId: string): string {
  if (type === 'return') {
    return `Your request ID is ${requestId}. Your request will be reviewed and verified, and if accepted, it will be processed in ${RETURN_PROCESSING_DAYS} business days.`;
  }
  return `Thank you. Your request ID is ${requestId}. Our team will look into it.`;
}

export function isAllowedImage(type: string, size: number): boolean {
  return /^image\/(jpeg|png|webp|heic|heif)$/.test(type) && size > 0 && size <= MAX_IMAGE_BYTES;
}
