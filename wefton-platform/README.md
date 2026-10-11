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
cp .env.local.example .env.local
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

A second job, **Playwright Layout Checks**, builds the app with the public
Firebase config from `apphosting.yaml` (so pages render real Firestore data) and
runs `npm run test:e2e` against `next start`. It loads the main pages (home, men,
women, new arrivals, bestsellers, about, vision, size guide, shipping, checkout)
and the first product page at **375, 768, 1024 and 1440 px**, and checks that:

- the header, main content and footer render;
- the right navigation shows for the width (menu button below 1024 px);
- the page is no wider than the viewport, measured on load and after scrolling
  through, with `overflow-x: hidden` switched off so clipped overflow still fails.

A full-page screenshot of every page at every width is attached to the
`playwright-report` artifact for visual review.

To run them locally:

```bash
npx playwright install chromium   # once
npm run build && npm run test:e2e
```

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
