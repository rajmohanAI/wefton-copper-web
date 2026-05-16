# Wefton Copper — Premium E-Commerce Platform

A production-grade luxury e-commerce platform built with Next.js 15, Firebase, and Framer Motion.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS Variables |
| Animations | Framer Motion |
| State | Zustand (persist middleware) |
| Backend | Firebase (Auth, Firestore, Storage) |
| Forms | React Hook Form + Zod |
| Deployment | Vercel (frontend) + Firebase (backend) |

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
4. Deploy security rules:

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

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all `NEXT_PUBLIC_FIREBASE_*` environment variables
4. Deploy

### GitHub Actions

CI/CD is configured in `.github/workflows/deploy.yml`.

Add these secrets to your GitHub repository:
- `NEXT_PUBLIC_FIREBASE_*` — all Firebase env vars
- `VERCEL_TOKEN` — from Vercel account settings
- `VERCEL_ORG_ID` — from Vercel project settings
- `VERCEL_PROJECT_ID` — from Vercel project settings

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
