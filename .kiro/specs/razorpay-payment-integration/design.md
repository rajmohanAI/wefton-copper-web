# Design Document — Razorpay Payment Integration

## Overview

This design describes how the Wefton Copper platform integrates Razorpay Standard Checkout to accept and verify online payments during checkout, replacing the current manual UPI-QR-plus-screenshot flow. The design prioritises security: the payable amount is fixed on the server, every payment is verified with an HMAC-SHA256 signature check on the server, and only trusted server code (via the Firebase Admin SDK) may mark an order as paid.

The account is a Razorpay co-branded IDFC First Bank account (dashboard at `idfcbank.razorpay.com`). This is a dashboard branding only — the integration uses the standard Razorpay Checkout script, standard `api.razorpay.com` endpoints, and standard `key_id`/`key_secret` credentials.

## Architecture

The platform is Next.js 16 (App Router) on Firebase App Hosting (Cloud Run, SSR) for project `weflive-58678`. Payment logic is split between the browser (Standard Checkout modal) and server route handlers (order creation, verification, webhook). Secrets stay server-side. The Firebase Admin SDK performs the privileged Firestore write that marks an order paid.

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Next.js 16 App Router                          │
├──────────────────────────────────────────────────────────────────────┤
│  Client (browser)                                                      │
│  ├── CheckoutClient.tsx  (address → payment → confirmation wizard)     │
│  │     • loads checkout.razorpay.com/v1/checkout.js                    │
│  │     • calls Order_Endpoint, opens Standard Checkout, calls Verify   │
│  ├── cartStore (Zustand)  — display totals (subtotal/ship/tax/total)   │
│  └── useAuth / authStore  — current user + Firebase ID token           │
├──────────────────────────────────────────────────────────────────────┤
│  Server route handlers  (src/app/api/razorpay/*)                       │
│  ├── POST /api/razorpay/order    (Order_Endpoint)                      │
│  │     • verifyIdToken, recompute amount, create Razorpay order        │
│  ├── POST /api/razorpay/verify   (Verify_Endpoint)                     │
│  │     • verify HMAC signature, mark Platform_Order verified (Admin)   │
│  └── POST /api/razorpay/webhook  (Webhook_Endpoint)                    │
│        • validate webhook secret, idempotently mark order verified     │
├──────────────────────────────────────────────────────────────────────┤
│  Server libraries                                                      │
│  ├── lib/razorpay.ts       — Razorpay Node client (key_id/key_secret)  │
│  ├── lib/firebaseAdmin.ts  — Admin SDK init (ADC on Cloud Run)         │
│  └── lib/razorpaySignature.ts — HMAC-SHA256 verify helpers             │
├──────────────────────────────────────────────────────────────────────┤
│  External services                                                     │
│  ├── Razorpay API (api.razorpay.com)   — order creation, verification  │
│  ├── Firebase Firestore (orders, products, coupons)                    │
│  └── Resend (order confirmation email — existing)                      │
└──────────────────────────────────────────────────────────────────────┘
```

### End-to-End Payment Sequence

```
Customer        CheckoutClient        Order_Endpoint      Razorpay        Verify_Endpoint     Firestore(Admin)
   │  proceed to pay  │                     │                │                  │                    │
   │─────────────────>│                     │                │                  │                    │
   │                  │ POST /order (+IDtok)│                │                  │                    │
   │                  │────────────────────>│ verify token   │                  │                    │
   │                  │                     │ recompute amt  │                  │                    │
   │                  │                     │ create order──>│                  │                    │
   │                  │  {order_id, amount, │<───order_id────│                  │                    │
   │                  │   currency, key_id} │                │                  │                    │
   │                  │<────────────────────│                │                  │                    │
   │  Standard Checkout modal (pay)         │                │                  │                    │
   │<─────────────────│  open checkout ─────────────────────>│                  │                    │
   │  pay (UPI/card…) │                     │                │                  │                    │
   │─────────────────────────────────────────────────────── >│                  │                    │
   │                  │  {payment_id,       │                │                  │                    │
   │                  │   order_id, sig}    │                │                  │                    │
   │                  │ POST /verify (+IDtok, sig) ───────────────────────────> │  HMAC verify       │
   │                  │                     │                │                  │  mark verified────>│
   │                  │<───────────────────── success ───────────────────────  │                    │
   │  confirmation    │                     │                │                  │                    │
   │<─────────────────│  clear cart, email, GA4 purchase     │                  │                    │
```

Reliability backstop: if the Customer closes the browser after paying but before `/verify` runs, Razorpay sends a `payment.captured` webhook to the Webhook_Endpoint, which marks the order verified using the same idempotent path.

## Components and Interfaces

### 1. `lib/firebaseAdmin.ts` — Firebase Admin SDK

- Adds the `firebase-admin` dependency.
- Initialises a singleton Admin app using Application Default Credentials (available on Cloud Run / App Hosting as the project service account for `weflive-58678`). No JSON key file is committed.
- Exports `getAdminDb()` (Firestore) and `verifyIdToken(idToken)` (Auth). Used only in server route handlers.
- For local development, supports a service-account credential supplied via a server-only environment variable (e.g. `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`), documented in the example env file.

### 2. `lib/razorpay.ts` — Razorpay Server Client

- Adds the `razorpay` (Node SDK) dependency.
- Lazily constructs the client from `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; returns `null` when unconfigured so endpoints can degrade gracefully (mirrors the existing `send-order-email` guard pattern).
- Exposes `createRazorpayOrder({ amountPaise, receipt, notes })`.

### 3. `lib/razorpaySignature.ts` — Signature Verification

- `verifyPaymentSignature({ orderId, paymentId, signature })`: computes `HMAC_SHA256(orderId + "|" + paymentId, KEY_SECRET)` and compares with `signature` using a constant-time comparison (`crypto.timingSafeEqual`).
- `verifyWebhookSignature(rawBody, signatureHeader)`: computes `HMAC_SHA256(rawBody, WEBHOOK_SECRET)` and compares to the `x-razorpay-signature` header. The webhook handler must read the raw request body (not parsed JSON) for a correct digest.

### 4. `POST /api/razorpay/order` — Order_Endpoint

Request (JSON): `{ platformOrderId?: string, items: CartItem[], couponCode?: string }`, plus `Authorization: Bearer <ID_Token>`.

Behaviour:
1. Verify the ID_Token; reject with 401 if invalid.
2. Recompute subtotal from `items` (using authoritative product prices where feasible), then apply shipping/tax/discount rules identical to `cartStore`/`orderService` (`SHIPPING_COST`, `FREE_SHIPPING_THRESHOLD`, `TAX_RATE`, coupon validation).
3. Create/ensure a Platform_Order in Firestore with `paymentStatus: "pending"`, `paymentMethod: "razorpay"`, tied to the authenticated `userId`.
4. Convert the rupee total to paise (`Math.round(total * 100)`) and create the Razorpay order (`currency: "INR"`, `receipt: platformOrderId`).
5. Respond `{ razorpayOrderId, amount, currency, keyId, platformOrderId }`. Never return the secret.

Errors: 503 if Razorpay/Admin unconfigured; 400 for invalid input; 401 for auth failure; 5xx for gateway failure.

### 5. `POST /api/razorpay/verify` — Verify_Endpoint

Request (JSON): `{ platformOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }` plus `Authorization: Bearer <ID_Token>`.

Behaviour:
1. Verify ID_Token (401 on failure).
2. Verify payment signature via `verifyPaymentSignature`. On mismatch → set order `paymentStatus: "failed"`, return 400.
3. Load the Platform_Order via Admin SDK; confirm it belongs to the authenticated user and that `razorpay_order_id` matches the stored value.
4. Idempotency: if already `verified`, return success without re-processing. Otherwise set `paymentStatus: "verified"`, store `razorpayOrderId` / `razorpayPaymentId` / verification metadata, and update `orderStatus` to `confirmed`.
5. Return `{ success: true, platformOrderId }`.

### 6. `POST /api/razorpay/webhook` — Webhook_Endpoint

- Reads the raw body, validates `x-razorpay-signature` with the Webhook_Secret.
- On a valid success event (`payment.captured` / `order.paid`), looks up the Platform_Order by the Razorpay order id/receipt and marks it verified idempotently (same as Verify_Endpoint step 4). Uses the Admin SDK.
- Returns 2xx quickly for accepted events; 400 for invalid signature.
- Runtime note: this handler needs the raw request body, so it must not rely on automatic JSON parsing that would alter the bytes.

### 7. `CheckoutClient.tsx` — Payment Step Changes

- Load `checkout.js` once (script injection guarded so it loads a single time).
- Replace the manual UPI QR image + screenshot upload UI with a "Pay with Razorpay" action.
- On pay: fetch ID_Token (`getIdToken()`), call Order_Endpoint, then open Standard Checkout with `{ key: keyId, order_id, amount, currency, name: "Wefton Copper", prefill: { name, email, contact }, theme: { color } }` and a `handler` that posts the returned fields to Verify_Endpoint.
- On verify success: advance to confirmation, `clearCart()`, fire existing confirmation email + `trackPurchase`.
- On `ondismiss`/failure: stay on payment step, show a retry-able message. Guard against duplicate submits with an in-flight flag.

### 8. Order Service / Types

- Extend `Order` (`src/types/index.ts`) with optional: `razorpayOrderId?: string`, `razorpayPaymentId?: string`, `paymentVerifiedAt?: string`. Keep existing `paymentReference` for backward compatibility.
- Add server-side order helpers that use the Admin SDK (create pending order, mark verified/failed) rather than the client SDK, since verified writes must bypass client rules.
- Existing client `orderService.ts` remains for reads (`getUserOrders`, etc.).

## Data Models

`Order` (extended, additions in **bold**):

```ts
interface Order {
  orderId: string;
  userId: string;
  products: OrderItem[];
  subtotal: number;       // rupees
  shipping: number;       // rupees
  taxes: number;          // rupees
  total: number;          // rupees (authoritative amount = total * 100 paise)
  paymentStatus: 'pending' | 'uploaded' | 'verified' | 'failed' | 'refunded';
  orderStatus: 'placed' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  paymentMethod: 'qr' | 'razorpay' | 'stripe' | 'cod';
  paymentReference?: string;
  paymentScreenshot?: string;     // legacy (qr flow)
  razorpayOrderId?: string;       // NEW
  razorpayPaymentId?: string;     // NEW
  paymentVerifiedAt?: string;     // NEW
  trackingNumber?: string;
  createdAt: string;
  updatedAt?: string;
}
```

Amount handling: prices are whole-rupee `number`s. Razorpay amount = `Math.round(total * 100)` (integer paise). Because `getTax()` already rounds and totals are integer rupees, `×100` yields exact paise.

## Firestore Security Rules

- `orders` rules stay restrictive: clients may `create` their own `pending` order and `read` their own orders; `update` (including setting `verified`) remains admin/server-only. Admin SDK writes bypass rules, so verified writes are safe.
- Optionally tighten `create` to forbid a client from setting `paymentStatus` to anything other than `pending`.

## Configuration and Secrets

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | client (static literal) | Public key id for Checkout |
| `RAZORPAY_KEY_ID` | server | Key id for the Node SDK / order creation |
| `RAZORPAY_KEY_SECRET` | server only | Signature + API auth (never client) |
| `RAZORPAY_WEBHOOK_SECRET` | server only | Webhook validation |
| `FIREBASE_SERVICE_ACCOUNT_JSON` (dev only) | server only | Admin SDK creds locally (ADC in prod) |

- Local dev: values in `.env.local`; placeholders documented in `.env.local.example`.
- Production (App Hosting): public key id may go in `apphosting.yaml`; secrets wired via Cloud Secret Manager (`apphosting.yaml` `secret:` + `availability: [RUNTIME]`), not committed as plaintext.

## Error Handling

- Endpoints follow the existing route-handler pattern: guard on missing config (503), validate input (400), `try/catch` around gateway calls with structured `console.error` (no secrets), and typed JSON error responses.
- Client shows non-technical messages; failures keep the user on the payment step with retry.
- Signature mismatch is recorded as `paymentStatus: "failed"` for audit.

## Testing Strategy

- Unit: `verifyPaymentSignature` (known Razorpay test vectors incl. tamper cases), amount→paise conversion, coupon/shipping/tax recomputation.
- Integration (Test_Mode keys): order creation returns a valid `order_id`; happy-path verify marks order verified; tampered signature returns 400 and marks failed; idempotent re-verify does not duplicate.
- Webhook: valid signed payload marks order verified; invalid signature → 400; duplicate event is idempotent.
- Manual: full Test_Mode checkout using Razorpay test instruments; confirm confirmation email + GA4 purchase fire once.

## Rollout / Migration

1. Land code behind Test_Mode keys; verify end-to-end in sandbox.
2. Keep the legacy `qr` method available as a fallback until live payments are confirmed stable (config flag), then retire it.
3. Configure the live webhook URL (`/api/razorpay/webhook`) and Webhook_Secret in the Razorpay dashboard.
4. Switch to Live_Mode keys via production secrets; smoke-test a low-value live order.
