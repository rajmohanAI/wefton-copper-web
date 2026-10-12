# Wefton Copper — Premium E-Commerce Platform

A production-grade luxury e-commerce platform built with Next.js 16, Firebase and Tailwind CSS 4.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + CSS Variables |
| Animations | Framer Motion |
| State | Zustand (persist middleware) |
| Backend | Firebase (Auth, Firestore, Storage) |
| Forms | React Hook Form + Zod |
| Deployment | Firebase App Hosting + Firebase (Auth, Firestore, Storage) |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/rajmohanAI/wefton-copper-web.git
cd wefton-copper-web/wefton-platform
npm install
```

### 2. Configure Firebase

Copy the example env file and fill in your Firebase project credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Set Up Firebase Project

In the [Firebase Console](https://console.firebase.google.com):

1. **Authentication** → Enable: Google, Facebook, Phone, Email/Password
2. **Firestore** → Create database in production mode
3. **Storage** → Enable Firebase Storage
4. Deploy security rules (run from `wefton-platform/`, the only folder with a `firebase.json`):

```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Homepage
│   ├── men/                # Men's collection
│   ├── women/              # Women's collection
│   ├── products/[slug]/    # Product detail
│   ├── checkout/           # Checkout flow
│   ├── account/            # User dashboard
│   ├── admin/              # Admin panel
│   ├── vision/             # Brand vision page
│   ├── about/              # About page
│   ├── search/             # Search results
│   ├── wishlist/           # Wishlist
│   ├── new-arrivals/       # New arrivals
│   └── bestsellers/        # Bestsellers
│
├── components/
│   ├── layout/             # Navbar, Footer, NewsletterForm
│   ├── home/               # Hero, FeaturedProducts, BrandStory, Testimonials
│   ├── product/            # ProductCard, ProductDetailClient
│   ├── catalog/            # CollectionPage, FilterSidebar
│   ├── cart/               # CartDrawer
│   ├── checkout/           # CheckoutClient (address → QR payment → confirmation)
│   ├── search/             # SearchOverlay, SearchResultsClient
│   ├── auth/               # AuthModal (Google, Facebook, Email, Phone OTP)
│   ├── account/            # AccountClient (profile, orders, wishlist, addresses)
│   ├── admin/              # AdminDashboard (orders, products, users)
│   ├── vision/             # VisionClient
│   ├── about/              # AboutClient
│   ├── wishlist/           # WishlistClient
│   ├── providers/          # AppProviders (ThemeProvider + AuthListener)
│   └── ui/                 # Button, Input, Badge, StarRating, Skeleton, SocialIcons
│
├── services/               # Firebase service layer
│   ├── authService.ts      # Google, Facebook, Email, Phone OTP auth
│   ├── productService.ts   # CRUD + filtering + search
│   ├── orderService.ts     # Order creation, QR payment upload, status updates
│   └── reviewService.ts    # Product reviews
│
├── store/                  # Zustand stores
│   ├── cartStore.ts        # Cart with persist, coupon, totals
│   ├── wishlistStore.ts    # Wishlist with persist
│   ├── authStore.ts        # Auth state
│   └── searchStore.ts      # Search state + history
│
├── hooks/
│   └── useAuth.ts          # Firebase auth state listener
│
├── lib/
│   ├── firebase.ts         # Lazy Firebase initialization (SSR-safe)
│   └── utils.ts            # formatPrice, slugify, debounce, etc.
│
├── config/
│   └── brand.ts            # Brand constants, categories, sizes
│
├── types/
│   └── index.ts            # All TypeScript interfaces
│
└── styles/
    └── globals.css         # Design system: CSS variables, glassmorphism, animations
```

---

## Firestore Schema

### `products`
```
productId, title, slug, description, shortDescription,
category, gender, tags[], price, comparePrice, inventory,
sku, images[], variants[], ratings, reviewsCount,
featured, bestseller, newArrival, createdAt
```

### `users`
```
uid, name, email, phone, avatar, addresses[],
wishlist[], orders[], role, createdAt
```

### `orders`
```
orderId, userId, products[], subtotal, shipping, taxes,
total, paymentStatus, orderStatus, shippingAddress,
paymentMethod, paymentReference, paymentScreenshot,
trackingNumber, createdAt
```

### `reviews`
```
reviewId, productId, userId, userName, rating,
comment, images[], verified, helpful, createdAt
```

---

## Payment Flow (Phase 1 — QR)

1. User places order → order created in Firestore with `paymentStatus: 'pending'`
2. QR code displayed → user pays via UPI
3. User clicks "I've Completed Payment" → order confirmed
4. Admin verifies in dashboard → updates `paymentStatus: 'verified'`

**Future:** Razorpay / Stripe integration ready via `paymentMethod` field.

---

## Admin Panel

Access at `/admin` — requires user with `role: 'admin'` in Firestore.

To make a user admin, update their Firestore document:
```
users/{uid} → role: "admin"
```

Features:
- Order management with payment approval
- Order status updates
- Revenue dashboard
- Product management (add/edit/delete)

---

## Deployment

The site runs on **Firebase App Hosting** (project `weflive-58678`). App Hosting
builds and deploys from GitHub on its own; there is no deploy workflow.
Build/runtime settings and public env vars live in `apphosting.yaml`.

### Branches and environments

Changes are promoted one environment at a time:

| Branch | Environment | URL |
|---|---|---|
| `feature/dev` | Development | dev.weftoncopper.com |
| `feature/qa` | QA / testing | qa.weftoncopper.com |
| `feature/pp` | Pre-production | pp.weftoncopper.com |
| `main` | Production | www.weftoncopper.com |

Work happens on short-lived branches merged into `feature/dev` by pull request.
`main` only accepts pull requests from `feature/pp` (enforced by the
"Main Source Guard" workflow plus a ruleset on `main`).

### CI

`.github/workflows/ci.yml` (repo root) runs on pull requests and pushes to the
branches above, from the `wefton-platform/` directory:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run lint:css    # Stylelint: no unlayered CSS (see src/styles/globals.css)
npm test            # Vitest unit + property tests
```

A second job, **Playwright Layout Checks**, builds the app and runs
`npm run test:e2e` against `next start`. It loads the main pages (home, men,
women, new arrivals, bestsellers, about, size guide) at a desktop (1440px) and
a mobile (Pixel 7) viewport and checks that the header, main content and footer
render, that the page has no horizontal overflow, and that the right navigation
shows for each width. Firestore is not configured in CI, so the checks cover the
page shell rather than product data.

To run them locally:

```bash
npx playwright install chromium   # once
npm run build && npm run test:e2e
```

---

## Online payments (Razorpay)

Checkout offers **Pay online** through Razorpay Standard Checkout, the payment
gateway provided by IDFC FIRST Bank. The UPI QR + screenshot flow stays as the
fallback. Until both keys below are set, the Pay online option is hidden and
checkout works exactly as before.

How it works ([Razorpay guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/)):

1. The browser creates the Firestore order as before, then calls
   `POST /api/payments/razorpay/order` with the user's Firebase ID token.
   The server re-prices the order from the catalog and coupon, and creates a
   Razorpay order for that amount (in paise).
2. The browser opens Razorpay Checkout (`checkout.js`) with that order id and
   the public key id returned by the server.
3. On success, `POST /api/payments/razorpay/verify` checks the HMAC-SHA256
   signature with the key secret and marks the order `paymentStatus: verified`,
   `orderStatus: confirmed`, `paymentMethod: razorpay`.

Only the server writes those fields (Firebase Admin SDK); `firestore.rules`
stops customers from creating an order that is already paid.

### Entering the keys

Get the **Key Id** and **Key Secret** from Razorpay Dashboard → Account &
Settings → API Keys. Use test keys (`rzp_test_…`) on dev/qa/pp and live keys
only on production.

**Local development:** put them in `wefton-platform/.env.local` (see
`.env.example`). Never commit that file. The Admin SDK also needs
`GOOGLE_APPLICATION_CREDENTIALS` pointing at a service-account key file.

**Firebase App Hosting:** store both as secrets, then uncomment the Razorpay
block at the bottom of `apphosting.yaml`:

```bash
cd wefton-platform
firebase apphosting:secrets:set RAZORPAY_KEY_ID
firebase apphosting:secrets:set RAZORPAY_KEY_SECRET
firebase apphosting:secrets:grantaccess RAZORPAY_KEY_ID,RAZORPAY_KEY_SECRET --backend wefton-copper-web
```

Each command prompts for the value, so the secret never lands in the repo or
shell history. To use test keys on one environment and live keys on another,
create differently named secrets and reference them from an
`apphosting.<environment>.yaml` override.

### Before going live

- Deploy the updated Firestore rules: `firebase deploy --only firestore:rules`.
- Razorpay Dashboard → Account & Settings → Payment capture: set **automatic**
  capture, otherwise authorized payments are refunded after a few days.
- Do a test-mode payment on dev with Razorpay's test cards/UPI before adding
  live keys.

---

## Brand Colors

| Variable | Value | Usage |
|---|---|---|
| `--copper-light` | `#d68f64` | Primary accent, headings |
| `--copper-main` | `#b85e26` | Buttons, borders, highlights |
| `--copper-dark` | `#8a4419` | Deep accents |
| `--bg-dark` | `#0f1115` | Page background |
| `--bg-darker` | `#08090a` | Section backgrounds |
| `--text-light` | `#e0e4e8` | Primary text |
| `--text-muted` | `#8b929a` | Secondary text |

---

## License

© 2026 Wefton Copper. All rights reserved.
