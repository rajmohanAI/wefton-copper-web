# Design Document — Wefton Copper V2 Overhaul

## Overview

This design document covers the Wefton Copper V2 Overhaul, transforming the platform from a motion-heavy canvas-driven architecture to a performance-first, static-render design. Key additions include a Swiper-powered banner slider, dark/light theming via next-themes, skeleton loaders, inventory auto-decrement, order email notifications via Resend, return/refund workflows, admin coupon CRUD, and GA4 integration.

## Architecture

The V2 overhaul restructures the Wefton Copper platform from a motion-heavy, canvas-driven architecture to a performance-first, static-render design. The system uses Next.js 16 App Router with React Server Components for data fetching, client components for interactivity, Zustand for client state, Firebase/Firestore for persistence, and Tailwind CSS 4 for styling with CSS custom properties enabling dark/light theming.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 16 App Router                     │
├─────────────────────────────────────────────────────────────────┤
│  Pages (Server Components)                                       │
│  ├── / (Homepage: Banner_Slider, Categories, Featured, Story)   │
│  ├── /men, /women (Collection pages with Product_Grid)          │
│  ├── /terms, /privacy, /refund-policy (Legal_Pages)             │
│  ├── /admin (AdminDashboard: Orders, Products, Returns, Coupons)│
│  └── /api/send-order-email (API Route)                          │
├─────────────────────────────────────────────────────────────────┤
│  Client Components (Interactivity)                               │
│  ├── Banner_Slider (Swiper), Theme_Switcher (next-themes)       │
│  ├── Product_Grid, ProductCard (CSS Grid, no Framer Motion)     │
│  ├── Skeleton_Loader (animate-pulse variants)                   │
│  └── GA4Tracker (gtag.js event dispatching)                     │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer                                                   │
│  ├── inventoryService.ts (Firestore transactions)               │
│  ├── orderEmailService.ts (Resend API integration)              │
│  ├── returnService.ts (Return_Request CRUD)                     │
│  └── couponService.ts (Coupon CRUD + validation)                │
├─────────────────────────────────────────────────────────────────┤
│  State Management (Zustand)                                      │
│  ├── cartStore, wishlistStore, authStore, searchStore           │
│  └── themeStore (delegated to next-themes)                      │
├─────────────────────────────────────────────────────────────────┤
│  External Services                                               │
│  ├── Firebase Firestore (products, orders, returns, coupons)    │
│  ├── Firebase Storage (product images)                          │
│  ├── Firebase Auth (user authentication)                        │
│  ├── Resend API (transactional emails)                          │
│  └── Google Analytics 4 (event tracking via gtag.js)            │
└─────────────────────────────────────────────────────────────────┘
```


---

## Components and Interfaces

### Banner_Slider Component

**File:** `src/components/home/BannerSlider.tsx` (Client Component)

```typescript
'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import Image from 'next/image';

interface BannerSlide {
  id: string;
  headline: string;
  subheading: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
  imageAlt: string;
}

interface BannerSliderProps {
  slides: BannerSlide[]; // 2–6 slides
}

export default function BannerSlider({ slides }: BannerSliderProps) {
  return (
    <Swiper
      modules={[Autoplay, Pagination, Navigation]}
      autoplay={{ delay: 5000, pauseOnMouseEnter: true }}
      pagination={{ clickable: true }}
      navigation
      loop
      className="w-full aspect-[16/7] md:aspect-[16/5]"
    >
      {slides.map((slide, index) => (
        <SwiperSlide key={slide.id}>
          <div className="relative w-full h-full">
            <Image
              src={slide.imageUrl}
              alt={slide.imageAlt}
              fill
              className="object-cover"
              priority={index === 0}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
            <div className="absolute inset-0 bg-black/30 flex flex-col
                            items-center justify-center text-center px-4">
              <h2 className="text-3xl md:text-5xl font-bold text-white">
                {slide.headline}
              </h2>
              <p className="text-base md:text-lg text-white/90 mt-2">
                {slide.subheading}
              </p>
              <a href={slide.ctaHref}
                 className="mt-6 px-8 py-3 bg-white text-black font-medium
                            rounded hover:bg-white/90 transition-colors">
                {slide.ctaText}
              </a>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
```


### Theme_Switcher Component

**File:** `src/components/layout/ThemeSwitcher.tsx` (Client Component)

```typescript
'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-5 h-5" />; // SSR placeholder

  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <button
      onClick={cycle}
      aria-label={`Current theme: ${theme}. Click to switch.`}
      className="text-[var(--text-muted)] hover:text-[var(--copper-light)]
                 transition-colors"
    >
      <Icon size={18} />
    </button>
  );
}
```

**Theme Provider Setup** (`src/app/layout.tsx`):

```typescript
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationMismatch>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```


### Skeleton_Loader Components

**File:** `src/components/ui/SkeletonLoader.tsx`

```typescript
import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  variant: 'product-card' | 'banner' | 'text-block' | 'nav-item';
  className?: string;
}

const VARIANT_STYLES: Record<SkeletonLoaderProps['variant'], string> = {
  'product-card': 'space-y-3',
  'banner': 'w-full aspect-[16/7] md:aspect-[16/5] rounded-none',
  'text-block': 'space-y-2',
  'nav-item': 'h-5 w-20 rounded',
};

export function SkeletonLoader({ variant, className }: SkeletonLoaderProps) {
  if (variant === 'product-card') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="aspect-[3/4] rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/4 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (variant === 'text-block') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
        <div className="h-4 w-4/6 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn(VARIANT_STYLES[variant],
                       'bg-muted animate-pulse', className)} />
  );
}
```


### Product_Grid Component (No Framer Motion)

**File:** `src/components/catalog/ProductGrid.tsx`

```typescript
import { ProductCard } from './ProductCard';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import type { Product } from '@/types';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  skeletonCount?: number;
}

export function ProductGrid({ products, loading, skeletonCount = 8 }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
                      gap-6 auto-rows-fr"
           style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonLoader key={i} variant="product-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
                    gap-6 auto-rows-fr"
         style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      {products.map((product) => (
        <ProductCard key={product.productId} product={product} />
      ))}
    </div>
  );
}
```

---

## Data Models

### Return_Request (Firestore Collection: `returns`)

```typescript
export interface ReturnRequest {
  returnId: string;            // Document ID
  orderId: string;             // Reference to orders collection
  customerId: string;          // User UID
  items: ReturnItem[];         // Items being returned
  reason: ReturnReason;        // Dropdown selection
  comments?: string;           // Optional, max 500 chars
  status: ReturnStatus;        // Workflow state
  rejectionReason?: string;    // Required when status = 'rejected', min 10 chars
  createdAt: string;           // Server timestamp (ISO string)
  updatedAt: string;           // Server timestamp (ISO string)
}

export interface ReturnItem {
  productId: string;
  variantId: string;
  title: string;
  size?: string;
  color?: string;
  quantity: number;
  image: string;
}

export type ReturnReason =
  | 'defective'
  | 'wrong_item'
  | 'size_issue'
  | 'changed_mind'
  | 'other';

export type ReturnStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded';
```


### Coupon (Firestore Collection: `coupons`)

```typescript
export interface Coupon {
  couponId: string;            // Document ID
  code: string;                // Uppercase, unique
  discount: number;            // Integer 1–100 (percentage)
  active: boolean;             // Toggle
  expiresAt: string | null;    // ISO date string or null (no expiry)
  createdAt: string;           // Server timestamp
  updatedAt: string;           // Server timestamp
}
```

### Coupon Zod Validation Schema

```typescript
import { z } from 'zod';

export const couponSchema = z.object({
  code: z.string()
    .min(1, 'Code is required')
    .max(20, 'Code must be 20 characters or less')
    .transform(v => v.toUpperCase())
    .refine(v => /^[A-Z0-9_-]+$/.test(v), 'Code must be alphanumeric'),
  discount: z.number()
    .int('Discount must be a whole number')
    .min(1, 'Minimum discount is 1%')
    .max(100, 'Maximum discount is 100%'),
  active: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
});
```

---

## Service Layer

### Inventory Service

**File:** `src/services/inventoryService.ts`

```typescript
import {
  runTransaction,
  doc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { OrderItem } from '@/types';

interface InventoryResult {
  success: boolean;
  error?: string;
  failedVariantId?: string;
}

/**
 * Atomically decrements inventory for all items in an order.
 * Uses a Firestore transaction to ensure consistency.
 * Aborts the entire transaction if any variant has insufficient stock.
 */
export async function decrementInventory(
  items: OrderItem[]
): Promise<InventoryResult> {
  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Firebase not configured' };

  try {
    await runTransaction(db, async (transaction) => {
      // Read all product docs first (required by Firestore transaction rules)
      const productReads = await Promise.all(
        items.map(async (item) => {
          const ref = doc(db, 'products', item.productId);
          const snap = await transaction.get(ref);
          return { item, ref, snap };
        })
      );

      // Validate stock availability for all items
      for (const { item, snap } of productReads) {
        if (!snap.exists()) {
          throw new Error(`Product ${item.productId} not found`);
        }
        const data = snap.data();
        const variants = data.variants || [];
        const variant = variants.find(
          (v: { variantId?: string; size?: string; color?: string }) =>
            (item.size && v.size === item.size) ||
            (v.variantId && v.variantId === item.productId)
        );
        const currentStock = variant?.inventory ?? data.inventory ?? 0;
        if (currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${item.title} (available: ${currentStock}, requested: ${item.quantity})`
          );
        }
      }

      // Apply decrements
      for (const { item, ref, snap } of productReads) {
        const data = snap.data()!;
        const variants = (data.variants || []).map(
          (v: { size?: string; inventory: number }) => {
            if (v.size === item.size) {
              return { ...v, inventory: v.inventory - item.quantity };
            }
            return v;
          }
        );
        const newTotalInventory = (data.inventory ?? 0) - item.quantity;
        transaction.update(ref, { variants, inventory: newTotalInventory });
      }
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Increments inventory when a return is refunded.
 */
export async function incrementInventory(
  items: { productId: string; variantId: string; size?: string; quantity: number }[]
): Promise<InventoryResult> {
  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Firebase not configured' };

  const batch = writeBatch(db);

  for (const item of items) {
    const ref = doc(db, 'products', item.productId);
    const snap = await getDoc(ref);
    if (!snap.exists()) continue;

    const data = snap.data();
    const variants = (data.variants || []).map(
      (v: { size?: string; inventory: number }) => {
        if (v.size === item.size) {
          return { ...v, inventory: v.inventory + item.quantity };
        }
        return v;
      }
    );
    const newTotal = (data.inventory ?? 0) + item.quantity;
    batch.update(ref, { variants, inventory: newTotal });
  }

  await batch.commit();
  return { success: true };
}
```


### Order Email Service

**File:** `src/services/orderEmailService.ts`

```typescript
import type { Order } from '@/types';

export type EmailType = 'confirmation' | 'shipped' | 'delivered';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Validates an email address format.
 * Returns true if the email is syntactically valid.
 */
export function isValidEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Builds the email payload for a given order and email type.
 * Pure function — testable without side effects.
 */
export function buildEmailPayload(
  order: Order,
  type: EmailType,
  recipientEmail: string
): EmailPayload {
  const subject = {
    confirmation: `Order Confirmed — #${order.orderId}`,
    shipped: `Your Order Has Shipped — #${order.orderId}`,
    delivered: `Order Delivered — #${order.orderId}`,
  }[type];

  const html = generateEmailHtml(order, type);

  return { to: recipientEmail, subject, html };
}

function generateEmailHtml(order: Order, type: EmailType): string {
  // Template generation logic per email type
  // Confirmation: order ID, items, total (INR), address, delivery window
  // Shipped: order ID, tracking info, estimated delivery date
  // Delivered: order ID, review link
  // Implementation uses template literals with branded HTML
}
```

### API Route: `/api/send-order-email`

**File:** `src/app/api/send-order-email/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isValidEmail, buildEmailPayload, type EmailType } from '@/services/orderEmailService';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { order, type, recipientEmail } = body as {
    order: Order;
    type: EmailType;
    recipientEmail: string;
  };

  // Validate email
  if (!isValidEmail(recipientEmail)) {
    return NextResponse.json(
      { error: 'Invalid or missing email address' },
      { status: 400 }
    );
  }

  const payload = buildEmailPayload(order, type, recipientEmail);

  try {
    await resend.emails.send({
      from: 'Wefton Copper <orders@weftoncopper.com>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    // Retry once after 5 seconds
    console.error(`[OrderEmail] Failed for order ${order.orderId}:`, error);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      await resend.emails.send({
        from: 'Wefton Copper <orders@weftoncopper.com>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });
      return NextResponse.json({ success: true, retried: true });
    } catch (retryError) {
      console.error(`[OrderEmail] Retry failed for order ${order.orderId}:`, retryError);
      return NextResponse.json(
        { error: 'Email delivery failed after retry' },
        { status: 502 }
      );
    }
  }
}
```


### Return Service

**File:** `src/services/returnService.ts`

```typescript
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { ReturnRequest, ReturnStatus } from '@/types';

const RETURNS_COL = 'returns';

/**
 * Determines if a return request can be filed for a given order.
 * Returns true if order is "delivered" and delivery date is within 7 days.
 */
export function isReturnEligible(
  orderStatus: string,
  deliveryDate: string | Date
): boolean {
  if (orderStatus !== 'delivered') return false;
  const delivered = new Date(deliveryDate);
  const now = new Date();
  const diffMs = now.getTime() - delivered.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

export async function createReturnRequest(
  data: Omit<ReturnRequest, 'returnId' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const ref = await addDoc(collection(db, RETURNS_COL), {
    ...data,
    status: 'pending' as ReturnStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateReturnStatus(
  returnId: string,
  status: ReturnStatus,
  rejectionReason?: string
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (status === 'rejected' && rejectionReason) {
    updateData.rejectionReason = rejectionReason;
  }

  await updateDoc(doc(db, RETURNS_COL, returnId), updateData);
}

export async function getReturnsByStatus(
  status?: ReturnStatus
): Promise<ReturnRequest[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const constraints = [orderBy('createdAt', 'desc')];
  if (status) constraints.unshift(where('status', '==', status));

  const q = query(collection(db, RETURNS_COL), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    returnId: d.id,
    ...(d.data() as Omit<ReturnRequest, 'returnId'>),
  }));
}

export async function getCustomerReturns(customerId: string): Promise<ReturnRequest[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, RETURNS_COL),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    returnId: d.id,
    ...(d.data() as Omit<ReturnRequest, 'returnId'>),
  }));
}
```


### Coupon Service

**File:** `src/services/couponService.ts`

```typescript
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { couponSchema } from '@/lib/schemas';
import type { Coupon } from '@/types';

const COUPONS_COL = 'coupons';

export async function getCoupons(
  sortField: 'code' | 'discount' | 'expiresAt' = 'code',
  sortDir: 'asc' | 'desc' = 'asc'
): Promise<Coupon[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(collection(db, COUPONS_COL), orderBy(sortField, sortDir));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    couponId: d.id,
    ...(d.data() as Omit<Coupon, 'couponId'>),
  }));
}

export async function couponCodeExists(code: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, COUPONS_COL),
    where('code', '==', code.toUpperCase())
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function createCoupon(
  data: { code: string; discount: number; active: boolean; expiresAt?: string | null }
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  // Validate with Zod
  const parsed = couponSchema.parse(data);

  // Check uniqueness
  const exists = await couponCodeExists(parsed.code);
  if (exists) throw new Error('Coupon code already exists');

  const ref = await addDoc(collection(db, COUPONS_COL), {
    ...parsed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCoupon(
  couponId: string,
  data: Partial<Pick<Coupon, 'discount' | 'active' | 'expiresAt'>>
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  await updateDoc(doc(db, COUPONS_COL, couponId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCoupon(couponId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');
  await deleteDoc(doc(db, COUPONS_COL, couponId));
}
```

---

## Tailwind CSS 4 Theme Configuration

**File:** `src/app/globals.css`

```css
@import "tailwindcss";

@theme {
  /* Typography scale (rem-based) */
  --font-family-heading: 'Inter', system-ui, sans-serif;
  --font-family-body: 'Inter', system-ui, sans-serif;

  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;
  --font-size-5xl: 3rem;

  /* Breakpoints */
  --breakpoint-sm: 375px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}

/* Light theme (default) */
:root {
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-card: #f9f9f9;
  --color-border: #e5e5e5;
  --color-muted: #737373;
  --color-muted-foreground: #525252;
  --color-accent: #b87333;       /* Copper */
  --color-accent-light: #d4956a;
  --color-destructive: #dc2626;
}

/* Dark theme */
.dark {
  --color-background: #0a0a0a;
  --color-foreground: #fafafa;
  --color-card: #171717;
  --color-border: #262626;
  --color-muted: #a3a3a3;
  --color-muted-foreground: #d4d4d4;
  --color-accent: #d4956a;       /* Copper (lighter for dark bg) */
  --color-accent-light: #e8b896;
  --color-destructive: #f87171;
}
```


---

## GA4 Integration

### GA4 Script Loader

**File:** `src/components/analytics/GA4Provider.tsx` (Client Component)

```typescript
'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

interface GA4ProviderProps {
  consentGranted: boolean;
}

export default function GA4Provider({ consentGranted }: GA4ProviderProps) {
  const pathname = usePathname();

  // Track page views on route change
  useEffect(() => {
    if (consentGranted && GA_ID && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: pathname,
      });
    }
  }, [pathname, consentGranted]);

  if (!consentGranted || !GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
```

### GA4 Event Helpers

**File:** `src/lib/analytics.ts`

```typescript
type GA4EventParams = Record<string, string | number | object[]>;

export function trackEvent(eventName: string, params: GA4EventParams): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

export function trackAddToCart(item: {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}): void {
  trackEvent('add_to_cart', {
    currency: 'INR',
    items: [item],
    value: item.price * item.quantity,
  });
}

export function trackPurchase(order: {
  transaction_id: string;
  value: number;
  shipping: number;
  items: { item_id: string; item_name: string; price: number; quantity: number }[];
}): void {
  trackEvent('purchase', {
    transaction_id: order.transaction_id,
    value: order.value,
    currency: 'INR',
    shipping: order.shipping,
    items: order.items,
  });
}

export function trackViewItem(item: {
  item_id: string;
  item_name: string;
  price: number;
}): void {
  trackEvent('view_item', {
    currency: 'INR',
    items: [item],
    value: item.price,
  });
}
```

---

## Error Handling

| Scenario | Handling Strategy |
|----------|------------------|
| Inventory decrement fails (insufficient stock) | Transaction aborted, user shown "Insufficient stock" error, no items decremented |
| Resend API error on email send | Log error, retry once after 5s delay, return 502 if retry fails |
| Invalid email on order email | Skip send, return 400 with validation error |
| Firestore unavailable | Service functions throw, callers display "Service unavailable" toast |
| Coupon code duplicate | Prevent creation, show "Coupon code already exists" inline error |
| Return request outside 7-day window | Hide return button, show "Return window has expired" text |
| Rejection reason too short (< 10 chars) | Form validation prevents submission, show inline error |
| Banner slider with 0–1 slides | Component validates prop and renders fallback static banner |
| Theme persistence failure | Graceful fallback to system preference |


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Banner slide image priority assignment

*For any* array of 2–6 banner slides, the rendered first slide SHALL have `priority={true}` on its Image component, and all subsequent slides SHALL have `loading="lazy"`.

**Validates: Requirements 1.7**

### Property 2: Theme selection applies correct class

*For any* theme value in the set {dark, light, system}, when selected via the Theme_Switcher, the `<html>` element SHALL receive the corresponding CSS class (`dark` or no class for light), and the selected value SHALL be persisted to localStorage such that reading it back yields the same value.

**Validates: Requirements 5.3, 5.4**

### Property 3: Colour token contrast ratio

*For any* defined colour token pair (text colour and background colour) in both dark and light themes, the computed contrast ratio SHALL be greater than or equal to 4.5:1 per WCAG 2.1 AA.

**Validates: Requirements 5.7**

### Property 4: Skeleton dimensions match content

*For any* Skeleton_Loader variant (product-card, banner, text-block, nav-item), its rendered width and height SHALL equal the width and height of the corresponding content element it replaces, preventing cumulative layout shift.

**Validates: Requirements 6.2, 17.4**

### Property 5: Inventory decrement correctness

*For any* order containing N items where each item i has quantity q_i, if all variants have sufficient stock (stock_i >= q_i), then after the inventory decrement operation, each variant's inventory SHALL equal (original_stock_i - q_i), and the total product inventory SHALL decrease by the sum of all quantities ordered.

**Validates: Requirements 8.1, 8.2**

### Property 6: Inventory insufficient stock rejection

*For any* order where at least one item's requested quantity exceeds the variant's current inventory, the Inventory_Service SHALL abort the entire transaction, no inventory values SHALL change, and an "Insufficient stock" error SHALL be returned.

**Validates: Requirements 8.3, 8.5**

### Property 7: Order email content completeness

*For any* valid order and any email type (confirmation, shipped, delivered), the generated email payload SHALL contain all required fields for that type: confirmation emails contain order ID, items, total in INR, address, and delivery window; shipped emails contain order ID and tracking info; delivered emails contain order ID and review link.

**Validates: Requirements 9.2, 9.3, 9.4**

### Property 8: Email validation correctness

*For any* string input, the `isValidEmail` function SHALL return `true` only if the string matches the format `localpart@domain.tld` with no whitespace, and SHALL return `false` for null, undefined, empty strings, and strings without a valid email structure.

**Validates: Requirements 9.6**

### Property 9: Return eligibility window

*For any* order with a delivery date, the return request option SHALL be available if and only if (a) the order status is "delivered" AND (b) the current date minus the delivery date is 7 days or fewer. If either condition fails, the return option SHALL be hidden.

**Validates: Requirements 10.1, 10.6**

### Property 10: Return request document creation

*For any* valid return request submission (valid orderId, at least one item, valid reason, comments <= 500 chars), the created Firestore document SHALL contain all required fields: orderId, customerId, items, reason, status="pending", createdAt (server timestamp), and updatedAt (server timestamp).

**Validates: Requirements 10.3**

### Property 11: Return status transition — rejection requires reason

*For any* return request rejection, if the rejection reason string has fewer than 10 characters, the rejection SHALL be prevented. If the reason has 10 or more characters, the Return_Request status SHALL be updated to "rejected" and the `rejectionReason` field SHALL contain the provided reason string.

**Validates: Requirements 11.4**

### Property 12: Refund restores inventory

*For any* return request marked as "refunded" containing items with quantities, the Inventory_Service SHALL increment the corresponding variant inventory by the returned quantity for each item, and the Return_Request status SHALL be updated to "refunded".

**Validates: Requirements 11.5**

### Property 13: Return request filtering

*For any* status filter value (pending, approved, rejected, refunded) and any set of return requests, the filtered results SHALL contain only requests whose status matches the filter value, and SHALL be sorted by createdAt descending.

**Validates: Requirements 11.1, 11.6**

### Property 14: Coupon validation and uniqueness

*For any* coupon creation input, the Zod schema SHALL accept inputs where code is a non-empty alphanumeric string and discount is an integer between 1 and 100 (inclusive). If a coupon with the same code (case-insensitive) already exists, creation SHALL fail with a "Coupon code already exists" error.

**Validates: Requirements 13.3, 13.4**

### Property 15: Coupon table sorting

*For any* set of coupons and any sort field (code, discount, expiresAt), the returned coupon list SHALL be ordered according to the specified field and direction (ascending or descending).

**Validates: Requirements 13.7**

### Property 16: GA4 event payload correctness

*For any* trackable user action (add_to_cart, purchase, view_item, page_view), the dispatched GA4 event SHALL contain all required parameters for that event type with currency set to "INR", and SHALL only be dispatched when tracking consent is granted.

**Validates: Requirements 14.2, 14.3, 14.4, 14.5, 14.6**


---

## Testing Strategy

**Test Runner:** Vitest (already configured in project)
**Property-Based Testing:** fast-check (already in devDependencies)

### Unit Tests (Example-Based)

- Banner_Slider renders correct number of slides and Swiper config
- Theme_Switcher cycles through dark → system → light
- Skeleton_Loader renders correct animate-pulse class for each variant
- Product_Grid renders correct CSS Grid classes without Framer Motion imports
- Legal pages render at correct routes with required content structure
- Admin coupon form displays correct fields and read-only code on edit
- Return request form hides after 7-day window expiry message
- GA4 script not loaded when consent is denied
- Resend API error triggers single retry after 5s delay

### Property Tests (fast-check, min 100 iterations)

- Inventory decrement arithmetic correctness (Property 5)
- Inventory rejection on insufficient stock (Property 6)
- Email payload completeness per order type (Property 7)
- Email validation classifies valid/invalid addresses (Property 8)
- Return eligibility window calculation (Property 9)
- Return request document field completeness (Property 10)
- Rejection reason minimum length enforcement (Property 11)
- Refund inventory increment correctness (Property 12)
- Return filtering by status correctness (Property 13)
- Coupon Zod validation acceptance/rejection (Property 14)
- Coupon list sorting correctness (Property 15)
- GA4 event payload completeness and consent gating (Property 16)

### Integration Tests

- `/api/send-order-email` route end-to-end with mocked Resend
- Firestore transaction atomicity for concurrent inventory decrements
- next-themes provider integration with localStorage persistence
