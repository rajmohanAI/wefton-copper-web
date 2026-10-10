# Implementation Plan: Razorpay Payment Integration

## Overview

This plan integrates Razorpay Standard Checkout into the Wefton Copper platform (`wefton-copper/wefton-platform`), replacing the manual UPI-QR-plus-screenshot payment flow with automated, server-verified online payments. Tasks are ordered to build server foundations first (Admin SDK, Razorpay client, signature helpers, config), then the server endpoints, then the client checkout changes, then reliability (webhook) and hardening. All work targets Next.js 16 route handlers on Firebase App Hosting (SSR). Per the workspace rule, the Next.js 16 docs under `node_modules/next/dist/docs/` must be consulted before writing any route-handler or server code.

## Tasks

- [ ] 1. Configuration and dependencies foundation
  - [ ] 1.1 Add dependencies `razorpay` and `firebase-admin` to `package.json` and install
    - Pin exact versions; verify they resolve on the Node runtime used by App Hosting
    - _Requirements: 1.1, 4.1_
  - [ ] 1.2 Add environment variable placeholders to `.env.local.example`
    - `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and dev-only `FIREBASE_SERVICE_ACCOUNT_JSON`
    - Document that secrets must never be `NEXT_PUBLIC_` and that prod secrets are wired via Cloud Secret Manager
    - _Requirements: 8.1, 8.2, 8.3, 4.6_
  - [ ] 1.3 Wire the public key id for production in `apphosting.yaml` and document secret wiring
    - Add `NEXT_PUBLIC_RAZORPAY_KEY_ID` (public) to `env`; add commented `secret:` entries for `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` with `availability: [RUNTIME]`
    - _Requirements: 8.1, 8.2, 8.4_

- [ ] 2. Server libraries
  - [ ] 2.1 Create `src/lib/firebaseAdmin.ts`
    - Singleton Admin app via ADC (prod) with dev fallback to `FIREBASE_SERVICE_ACCOUNT_JSON`
    - Export `getAdminDb()` and `verifyIdToken(idToken)`
    - _Requirements: 4.1, 4.3_
  - [ ] 2.2 Create `src/lib/razorpay.ts`
    - Lazily build the Razorpay client from `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`; return null when unconfigured
    - Export `createRazorpayOrder({ amountPaise, receipt, notes })`
    - _Requirements: 1.1, 1.4, 8.5_
  - [ ] 2.3 Create `src/lib/razorpaySignature.ts`
    - `verifyPaymentSignature({ orderId, paymentId, signature })` using HMAC-SHA256 of `orderId|paymentId` and `crypto.timingSafeEqual`
    - `verifyWebhookSignature(rawBody, signatureHeader)` using the webhook secret
    - _Requirements: 3.2, 3.3, 7.2_
  - [ ] 2.4 Add server-side order helpers (Admin SDK) in `src/services/orderServiceAdmin.ts`
    - `createPendingOrder(...)`, `markOrderVerified(...)`, `markOrderFailed(...)`; idempotent verified write
    - _Requirements: 4.2, 3.4, 3.6, 5.4_
  - [ ] 2.5 Unit tests for signature + amount conversion
    - Valid/tampered signature vectors; `Math.round(total*100)` paise conversion
    - _Requirements: 3.2, 3.3, 1.3_

- [ ] 3. Data model and rules
  - [ ] 3.1 Extend the `Order` type in `src/types/index.ts`
    - Add `razorpayOrderId?`, `razorpayPaymentId?`, `paymentVerifiedAt?`; keep legacy fields
    - _Requirements: 5.1, 5.2, 5.5_
  - [ ] 3.2 Review/tighten `firestore.rules` for `orders`
    - Ensure clients can create only `pending` orders and cannot set `verified`; keep update server/admin-only
    - _Requirements: 4.5, 5.4_

- [ ] 4. Order_Endpoint — `POST /api/razorpay/order`
  - [ ] 4.1 Implement route handler following the existing `send-order-email` pattern
    - Verify ID_Token; 401 on failure. 503 if Razorpay/Admin unconfigured
    - _Requirements: 1.1, 4.3, 8.5_
  - [ ] 4.2 Recompute authoritative amount server-side
    - Subtotal from items, apply `SHIPPING_COST`/`FREE_SHIPPING_THRESHOLD`/`TAX_RATE` and validated coupon; do not trust client total
    - _Requirements: 1.2, 10.2_
  - [ ] 4.3 Create the pending Platform_Order and the Razorpay order
    - Convert to paise; `currency: INR`; `receipt: platformOrderId`; return `{ razorpayOrderId, amount, currency, keyId, platformOrderId }` (no secret)
    - _Requirements: 1.3, 1.4, 1.5, 1.7, 5.4_
  - [ ] 4.4 Error handling and logging
    - Structured `console.error` without secrets; typed JSON errors
    - _Requirements: 1.6, 9.1, 9.4_

- [ ] 5. Verify_Endpoint — `POST /api/razorpay/verify`
  - [ ] 5.1 Implement route handler with ID_Token verification
    - _Requirements: 3.1, 4.3_
  - [ ] 5.2 Verify signature; on mismatch mark `failed` and return 400
    - _Requirements: 3.3, 3.5, 9.2_
  - [ ] 5.3 Ownership + order-id match check, then idempotent verified write
    - Confirm order belongs to user and `razorpay_order_id` matches stored value; set `verified` + `confirmed`; no duplicate processing
    - _Requirements: 3.4, 3.6, 4.2, 4.4_
  - [ ] 5.4 Return typed success/failure responses
    - _Requirements: 3.4, 9.3, 9.4_

- [ ] 6. Client checkout integration — `CheckoutClient.tsx`
  - [ ] 6.1 Load `checkout.razorpay.com/v1/checkout.js` once (guarded); handle load failure
    - _Requirements: 2.1, 2.7_
  - [ ] 6.2 Replace the UPI-QR + screenshot payment step with a "Pay with Razorpay" action
    - Fetch ID_Token, call Order_Endpoint, open Standard Checkout with order_id/amount/currency/keyId, prefill name/email/phone, brand name/colour
    - _Requirements: 2.2, 2.3, 2.4, 6.1_
  - [ ] 6.3 Implement the checkout `handler` → call Verify_Endpoint
    - On success: advance to confirmation, `clearCart()`, fire existing confirmation email + `trackPurchase`
    - _Requirements: 2.5, 6.3_
  - [ ] 6.4 Handle dismiss/failure and prevent duplicate submits
    - `ondismiss` returns to payment step; retry allowed; in-flight guard
    - _Requirements: 2.6, 6.4, 6.5_

- [ ] 7. Webhook_Endpoint — `POST /api/razorpay/webhook` (reliability)
  - [ ] 7.1 Implement route handler reading the raw body
    - Validate `x-razorpay-signature` with `RAZORPAY_WEBHOOK_SECRET`; 400 on invalid
    - _Requirements: 7.1, 7.2, 7.4_
  - [ ] 7.2 Idempotently mark order verified on success events
    - Handle `payment.captured`/`order.paid`; look up by receipt/order id; respond 2xx promptly
    - _Requirements: 7.3, 7.5, 3.6_

- [ ] 8. Testing and verification
  - [ ] 8.1 Integration tests in Test_Mode
    - Order creation returns valid `order_id`; happy-path verify; tampered signature → 400 + failed; idempotent re-verify
    - _Requirements: 3.1–3.6, 1.1–1.5_
  - [ ] 8.2 Webhook tests
    - Valid signed payload marks verified; invalid → 400; duplicate event idempotent
    - _Requirements: 7.1–7.5_
  - [ ] 8.3 Manual end-to-end Test_Mode checkout
    - Full flow with Razorpay test instruments; confirm email + GA4 purchase fire exactly once
    - _Requirements: 6.1–6.5_
  - [ ] 8.4 Run `next build` and fix any errors
    - _Requirements: (build integrity)_

- [ ] 9. Rollout
  - [ ] 9.1 Keep legacy `qr` method behind a config flag as fallback until live payments are stable
    - _Requirements: 5.5_
  - [ ] 9.2 Configure live webhook URL + Webhook_Secret in the Razorpay dashboard
    - _Requirements: 7.1, 7.2_
  - [ ] 9.3 Switch to Live_Mode secrets in production; smoke-test a low-value live order
    - _Requirements: 8.4, 10.3_
