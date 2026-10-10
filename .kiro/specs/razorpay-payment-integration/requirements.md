# Requirements Document

## Introduction

This document defines the requirements for integrating the Razorpay Payment Gateway (Standard Checkout) into the Wefton Copper e-commerce platform. The integration replaces the current manual UPI-QR-plus-screenshot payment flow with an automated, verifiable online payment experience. Customers will pay via Razorpay Standard Checkout (cards, UPI, netbanking, wallets) during checkout, and every payment will be cryptographically verified on the server before the order is marked paid.

The Wefton Copper account is provisioned through Razorpay's co-branded IDFC First Bank programme; the merchant dashboard is accessed at `idfcbank.razorpay.com`. This is a co-branded dashboard only — the integration uses the standard Razorpay Checkout script (`checkout.razorpay.com/v1/checkout.js`), the standard Razorpay API (`api.razorpay.com`), and standard `key_id` / `key_secret` credentials. No bank-specific SDK or endpoint is required.

The platform is a Next.js 16 application (React 19, TypeScript) hosted on Firebase App Hosting (Cloud Run, server-side rendering) for the Firebase project `weflive-58678`. All prices are in Indian Rupees (INR), stored as whole-rupee numbers.

---

## Glossary

- **Platform**: The Wefton Copper Next.js 16 web application (`wefton-copper/wefton-platform`).
- **Customer**: An authenticated end-user purchasing products through checkout.
- **Admin**: An authenticated user with `role: "admin"` in Firestore who manages orders.
- **Razorpay**: The Razorpay Standard Checkout payment gateway, accessed via the co-branded IDFC First Bank account.
- **Standard_Checkout**: Razorpay's hosted, Razorpay-managed checkout modal loaded via `checkout.razorpay.com/v1/checkout.js`.
- **Razorpay_Order**: An order object created via the Razorpay Orders API that holds the amount, currency, and a unique `id` (prefixed `order_`). Distinct from the Platform's own Firestore Order.
- **Platform_Order**: A document in the Firestore `orders` collection representing the Customer's purchase, typed by the `Order` interface.
- **Order_Endpoint**: The server route handler that creates a Razorpay_Order.
- **Verify_Endpoint**: The server route handler that verifies the Razorpay payment signature and finalises the Platform_Order.
- **Webhook_Endpoint**: The server route handler that receives asynchronous payment events directly from Razorpay.
- **Signature**: The HMAC-SHA256 value Razorpay returns (`razorpay_signature`) used to prove a payment response is authentic.
- **Key_ID**: The public Razorpay API key identifier (`key_id`), safe to expose to the browser.
- **Key_Secret**: The private Razorpay API key secret (`key_secret`), which MUST remain server-side only.
- **Webhook_Secret**: The shared secret used to validate the authenticity of Razorpay webhook requests.
- **Paise**: The smallest currency subunit of INR; 1 rupee = 100 paise. Razorpay amounts are expressed in paise.
- **Admin_SDK**: The Firebase Admin SDK (`firebase-admin`), used server-side for privileged Firestore writes and ID-token verification.
- **ID_Token**: A Firebase Authentication ID token sent by the client and verified server-side to identify the Customer.
- **Cart_Store**: The Zustand cart store (`src/store/cartStore.ts`) that holds cart items and computes subtotal, shipping, tax, and total.
- **Order_Service**: The Firestore order module (`src/services/orderService.ts`).
- **Checkout_Client**: The checkout wizard component (`src/components/checkout/CheckoutClient.tsx`).
- **INR**: Indian Rupee (₹), the sole currency of the Platform.
- **Test_Mode**: Razorpay's sandbox environment, using test keys, where no real money moves.
- **Live_Mode**: Razorpay's production environment, using live keys, where real money moves.

---

## Requirements

### Requirement 1: Server-Side Razorpay Order Creation

**User Story:** As a Customer, I want the amount I pay to be fixed securely by the server, so that the total I am charged cannot be tampered with in my browser.

#### Acceptance Criteria

1. THE Platform SHALL expose an Order_Endpoint as a Next.js route handler that accepts a POST request to create a Razorpay_Order.
2. THE Order_Endpoint SHALL compute the payable amount server-side from authoritative inputs (cart line items and applicable shipping, tax, and discount rules) rather than trusting a client-supplied total.
3. THE Order_Endpoint SHALL convert the computed rupee amount to Paise by multiplying by 100 and SHALL send an integer value to the Razorpay Orders API.
4. THE Order_Endpoint SHALL create the Razorpay_Order with `currency` set to `INR` and a `receipt` value that references the Platform_Order identifier.
5. WHEN the Razorpay_Order is created successfully, THE Order_Endpoint SHALL return the Razorpay_Order `id`, the amount in Paise, the currency, and the public Key_ID to the client.
6. IF the Razorpay API call fails or credentials are missing, THEN THE Order_Endpoint SHALL return an appropriate HTTP error status (5xx for server/config errors, 4xx for invalid requests) and SHALL NOT create a paid Platform_Order.
7. THE Order_Endpoint SHALL never expose the Key_Secret in any response or client-accessible location.

### Requirement 2: Client-Side Standard Checkout

**User Story:** As a Customer, I want to complete payment through a familiar, secure checkout popup, so that I can pay using my preferred method (UPI, card, netbanking, or wallet).

#### Acceptance Criteria

1. THE Checkout_Client SHALL load the Razorpay Standard_Checkout script from `https://checkout.razorpay.com/v1/checkout.js`.
2. WHEN the Customer proceeds to pay, THE Checkout_Client SHALL first request a Razorpay_Order from the Order_Endpoint and THEN open Standard_Checkout configured with the returned `order_id`, amount, currency, and Key_ID.
3. THE Checkout_Client SHALL prefill the Customer's name, email, and phone number in Standard_Checkout when those values are available.
4. THE Checkout_Client SHALL display the Wefton Copper brand name and, where supported, brand colour and logo in the Standard_Checkout configuration.
5. WHEN the Customer completes payment, THE Checkout_Client SHALL receive `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` from Standard_Checkout and SHALL submit them to the Verify_Endpoint.
6. WHEN the Customer dismisses or cancels Standard_Checkout, THE Checkout_Client SHALL return the Customer to the payment step without creating a paid Platform_Order and SHALL allow retry.
7. IF the Standard_Checkout script fails to load, THEN THE Checkout_Client SHALL display an error message and SHALL NOT proceed with payment.

### Requirement 3: Server-Side Payment Signature Verification

**User Story:** As the Platform owner, I want every payment verified cryptographically on the server, so that only genuine, completed payments mark an order as paid.

#### Acceptance Criteria

1. THE Platform SHALL expose a Verify_Endpoint as a Next.js route handler that accepts a POST request containing `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
2. THE Verify_Endpoint SHALL compute an HMAC-SHA256 digest of the string `razorpay_order_id + "|" + razorpay_payment_id` using the Key_Secret.
3. THE Verify_Endpoint SHALL compare the computed digest with the supplied `razorpay_signature` using a constant-time comparison.
4. WHEN the signatures match, THE Verify_Endpoint SHALL mark the corresponding Platform_Order as paid (`paymentStatus: "verified"`, `paymentMethod: "razorpay"`) and SHALL persist the Razorpay payment and order identifiers.
5. IF the signatures do not match, THEN THE Verify_Endpoint SHALL return an HTTP 400 response, SHALL NOT mark the Platform_Order as paid, and SHALL record the attempt as a failed payment.
6. THE Verify_Endpoint SHALL be idempotent such that repeated verification of the same successful payment does not create duplicate paid orders or double-decrement inventory.

### Requirement 4: Secure Order Persistence and Authorisation

**User Story:** As the Platform owner, I want paid orders written by trusted server code, so that payment status cannot be forged by a client.

#### Acceptance Criteria

1. THE Platform SHALL initialise the Admin_SDK in server route handlers using the runtime service-account credentials available on Firebase App Hosting.
2. THE Verify_Endpoint SHALL write the verified payment status to the Platform_Order using the Admin_SDK.
3. THE Platform SHALL require the client to send a Firebase ID_Token with requests to the Order_Endpoint and Verify_Endpoint, and THE endpoints SHALL verify the ID_Token with the Admin_SDK to establish the Customer identity.
4. THE Verify_Endpoint SHALL confirm that the authenticated Customer owns the Platform_Order being finalised before marking it paid.
5. THE Firestore security rules SHALL continue to forbid clients from setting `paymentStatus: "verified"` directly, so that only server (Admin_SDK) writes can mark an order paid.
6. THE Platform SHALL store the Key_Secret and Webhook_Secret as server-only secrets and SHALL NOT prefix them with `NEXT_PUBLIC_`.

### Requirement 5: Order Data Model Extensions

**User Story:** As an Admin, I want each order to record its Razorpay references, so that I can reconcile payments and handle support queries.

#### Acceptance Criteria

1. THE Platform SHALL extend the `Order` type to store the Razorpay order identifier, Razorpay payment identifier, and payment signature (or a stored verification result).
2. THE Platform SHALL retain `paymentMethod: "razorpay"` as a valid value and SHALL set it for orders paid through Razorpay.
3. THE Platform SHALL preserve the existing `paymentStatus` state set (`pending`, `verified`, `failed`, `refunded`) and SHALL use `verified` only for server-verified Razorpay payments.
4. WHEN a Platform_Order is created at the start of checkout, THE Platform SHALL set `paymentStatus: "pending"` until server verification succeeds.
5. THE Platform SHALL preserve backward compatibility for historical orders created with the manual `qr` payment method.

### Requirement 6: Checkout Flow Integration

**User Story:** As a Customer, I want a single, smooth checkout that ends in confirmation, so that I know my order and payment succeeded.

#### Acceptance Criteria

1. THE Checkout_Client SHALL keep the existing three-step structure (address → payment → confirmation) and SHALL replace the manual UPI-QR-and-screenshot payment step with Razorpay Standard_Checkout.
2. THE Checkout_Client SHALL use the amount computed by the Cart_Store and Order_Service as the source of the display total, while the authoritative charged amount is fixed by the Order_Endpoint.
3. WHEN server verification succeeds, THE Checkout_Client SHALL advance to the confirmation step, clear the cart, and trigger the existing order confirmation email and analytics purchase event.
4. IF server verification fails, THEN THE Checkout_Client SHALL keep the Customer on the payment step, display a clear failure message, and allow the Customer to retry payment.
5. THE Checkout_Client SHALL prevent duplicate order submission while a payment or verification request is in progress.

### Requirement 7: Asynchronous Payment Confirmation via Webhook (Reliability)

**User Story:** As the Platform owner, I want payment status to be correct even if the Customer closes the browser after paying, so that no successful payment is lost.

#### Acceptance Criteria

1. THE Platform SHALL expose a Webhook_Endpoint as a Next.js route handler that receives Razorpay payment events.
2. THE Webhook_Endpoint SHALL validate each incoming request using the Webhook_Secret before processing it.
3. WHEN a valid `payment.captured` (or equivalent success) event is received for an order not yet marked paid, THE Webhook_Endpoint SHALL mark the corresponding Platform_Order as verified using the same idempotent logic as the Verify_Endpoint.
4. IF webhook validation fails, THEN THE Webhook_Endpoint SHALL reject the request with an HTTP 400 response and SHALL NOT modify any Platform_Order.
5. THE Webhook_Endpoint SHALL respond with an HTTP 2xx status promptly for accepted events so that Razorpay does not retry unnecessarily.

### Requirement 8: Configuration, Secrets, and Environments

**User Story:** As a developer, I want clear, safe configuration for test and live keys, so that I can integrate and go live without leaking secrets.

#### Acceptance Criteria

1. THE Platform SHALL read the public Key_ID from a `NEXT_PUBLIC_`-prefixed environment variable exposed to the client as a static literal.
2. THE Platform SHALL read the Key_Secret and Webhook_Secret only from server-side environment variables and SHALL never expose them to the client bundle.
3. THE Platform SHALL provide documented placeholders for all new environment variables in the example environment file without committing real key values.
4. THE Platform SHALL support Test_Mode credentials for development and Live_Mode credentials for production, selectable via environment configuration.
5. THE Platform SHALL degrade gracefully (return a clear "payment not configured" error) WHEN Razorpay credentials are absent, rather than crashing.

### Requirement 9: Error Handling, Logging, and Observability

**User Story:** As the Platform owner, I want failed and suspicious payments recorded, so that I can investigate and support Customers.

#### Acceptance Criteria

1. THE Order_Endpoint, Verify_Endpoint, and Webhook_Endpoint SHALL log failures server-side with enough context (order identifier, error category) to diagnose issues, without logging secrets or full card data.
2. WHEN signature verification fails, THE Platform SHALL record the associated Platform_Order with `paymentStatus: "failed"`.
3. THE Platform SHALL present Customer-facing error messages that are clear and non-technical, without exposing internal error details or secrets.
4. THE Platform SHALL not expose stack traces, secrets, or raw gateway errors in any client response.

### Requirement 10: Security and Compliance

**User Story:** As a Customer, I want my payment handled securely, so that my financial data is protected.

#### Acceptance Criteria

1. THE Platform SHALL delegate all collection of card, UPI, and banking credentials to Razorpay Standard_Checkout and SHALL NOT store or transmit raw payment instrument data.
2. THE Platform SHALL perform all amount determination and signature verification on the server, treating all client-supplied amounts and payment results as untrusted until verified.
3. THE Platform SHALL serve all payment-related pages and endpoints over HTTPS.
4. THE Platform SHALL scope the ability to refund or change paid order status to Admins and server code only.
