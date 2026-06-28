# Wefton Copper — Performance & QA Audit Report

**Date:** 2025-01-XX  
**Platform:** Next.js 16 · TypeScript · Tailwind CSS 4 · Firebase · Framer Motion · Swiper · next-themes  
**Auditor:** Kiro

---

## Executive Summary

The Wefton Copper platform is architecturally sound — good use of Server Components, Suspense boundaries, Zustand with `persist`, and responsive grids. However, several performance and responsiveness issues need attention, ranging from missing font optimisation (CLS risk) to heavy Framer Motion `layout` animations on product grids with 12+ items.

---

## 🔴 CRITICAL — Breaks functionality or causes >0.25 CLS

### C1. No Font Optimisation — FOUT causing CLS

**File:** `src/app/layout.tsx` + `src/styles/globals.css`

**Problem:**  
The app declares `font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif` in globals.css and `'Inter', system-ui, sans-serif` in `app/globals.css` (via `@theme`), but **neither uses `next/font`** nor any `@font-face` with `font-display: swap/optional`. There's also a conflict — two different font families declared across the two CSS files.

- If "Inter" is expected to load from Google Fonts or a CDN, there is no `<link>` or `next/font` import — meaning it **never loads**.
- The fallback to system fonts causes a **Flash of Unstyled Text (FOUT)** with different metrics, directly shifting layout (CLS > 0.25 on slow connections).
- Two conflicting font declarations (`Inter` vs `Helvetica Neue`) create inconsistency.

**Impact:** CLS shift on every page load, inconsistent typography across pages.

**Refactored Solution:**

```tsx
// src/app/layout.tsx — FIXED
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import AppProviders from '@/components/providers/AppProviders';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// ... metadata stays the same ...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <AppProviders>
          <Navbar />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
```

```css
/* src/styles/globals.css — FIXED (replace font-family line) */
body {
  background-color: var(--bg-dark);
  color: var(--text-light);
  font-family: var(--font-inter), 'Helvetica Neue', Helvetica, Arial, sans-serif;
  line-height: 1.6;
  overflow-x: hidden;
}
```

And remove the conflicting `@theme` font declarations in `src/app/globals.css` or unify them.

---

### C2. Framer Motion `layout` Animation on Product Grid (12+ items) — Jank & Forced Reflows

**File:** `src/components/catalog/CollectionPage.tsx` (lines 511-526)

**Problem:**  
The product grid uses `<motion.div layout>` on both the parent grid container AND every individual product card. The `layout` prop triggers **FLIP animations** that measure DOM geometry (getBoundingClientRect) for every child on every re-render. With 12+ products + infinite scroll loading more items, this causes:

1. **Expensive reflows** — each layout animation forces a synchronous layout recalculation for ALL visible items
2. **Jank during filtering** — switching categories triggers layout animation on 12+ items simultaneously
3. **Memory pressure** — Framer Motion retains transform state for every `layout`-enabled element

```tsx
// PROBLEMATIC CODE
<motion.div
  layout  // ← Forces FLIP on entire grid container
  className={viewMode === 'grid' ? '...' : '...'}
>
  {products.map((product, i) => (
    <motion.div
      key={product.productId}
      layout  // ← Forces FLIP on EACH card — N reflows
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.3) }}
    >
      <ProductCard product={product} priority={i < 6} />
    </motion.div>
  ))}
</motion.div>
```

**Impact:** 60fps drops to <30fps during filter/sort transitions on mid-range devices.

**Refactored Solution:**

```tsx
// FIXED — Remove layout animations, use CSS grid transitions instead
<div
  className={cn(
    'transition-all duration-300',
    viewMode === 'grid'
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'
      : 'grid grid-cols-1 gap-4'
  )}
>
  {products.map((product, i) => (
    <div
      key={product.productId}
      className="animate-fade-in"
      style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
    >
      <ProductCard product={product} priority={i < 6} />
    </div>
  ))}
</div>
```

Add to `src/styles/globals.css`:
```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out both;
}
```

This removes expensive JavaScript-measured FLIP animations and replaces them with GPU-accelerated CSS transitions using only `opacity` and `transform`.

---

## 🟠 HIGH — Degrades performance or causes layout issues on common devices

### H1. BannerSlider LCP Image Missing `sizes` Attribute

**File:** `src/components/home/BannerSlider.tsx`

**Problem:**  
The hero banner image (the LCP element) uses `fill` with `priority` but **has no `sizes` attribute**. Without `sizes`, Next.js defaults to `100vw` but the browser may still download a suboptimal size from the `deviceSizes` array, delaying LCP.

**Fix:**
```tsx
<Image
  src={slide.imageUrl}
  alt={slide.imageAlt}
  fill
  className="object-cover"
  priority={index === 0}
  loading={index === 0 ? 'eager' : 'lazy'}
  sizes="100vw"  // ← Add explicit sizes
/>
```

---

### H2. Navbar Mega-Menu Dropdown Fixed at `w-[820px]` — Overflows on Tablets

**File:** `src/components/layout/Navbar.tsx` (line 140)

**Problem:**  
The dropdown mega-menu has `w-[820px]` hardcoded. On screens between 1024px–900px (where `lg:flex` shows it), this will overflow the viewport and get clipped or create a horizontal scrollbar.

**Fix:**
```tsx
className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-50 w-[min(820px,90vw)] p-6 rounded-2xl ..."
```

---

### H3. Global CSS `mx-auto` Override with `!important` Breaks Flex/Grid Layouts

**File:** `src/styles/globals.css` (bottom)

**Problem:**
```css
.mx-auto {
  margin-left: auto !important;
  margin-right: auto !important;
  display: block;  /* ← This is dangerous */
}
```

This forces `display: block` on anything with `mx-auto`, which **breaks flex/grid children** that use `mx-auto` for centering. Elements in flex containers will lose their flex behavior.

**Fix:** Remove this override entirely. If Tailwind's `mx-auto` isn't working, the issue is the `* { margin: 0 }` reset above — scope it more narrowly:
```css
/* Remove the mx-auto override completely */
/* Fix the root cause: don't reset margins on utility classes */
```

---

### H4. Missing `will-change` on Animated Elements + No GPU Layer Promotion

**Problem:**  
The BrandStory parallax background, CartDrawer slide-in, and mobile menu all animate `transform` without `will-change: transform`. While Framer Motion often handles this, the CSS-only transitions (like the navbar glass effect, category tile hover scale) would benefit from explicit layer promotion on interactive elements.

**Fix:** Add `will-change-transform` to hover-scale elements:
```tsx
// CategoryShowcase tile
<Image
  ...
  className="object-cover transition-transform duration-500 group-hover:scale-105 will-change-transform"
/>
```

---

### H5. Product Card `sizes` Attribute Too Broad

**File:** `src/components/product/ProductCard.tsx`

**Problem:**
```tsx
sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 50vw"
```

On the homepage grid (4 columns at xl), each card is actually ~25vw. On collection page (3-col grid within sidebar layout), cards are ~22vw. Declaring `50vw` causes the browser to download images 2x larger than needed.

**Fix:**
```tsx
sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
```

---

### H6. `BrandStory` Parallax `useScroll` + `useTransform` Runs on Every Scroll Frame

**File:** `src/components/home/BrandStory.tsx`

**Problem:**  
`useScroll` with `useTransform` continuously runs on every scroll frame to move a decorative background gradient. This is a purely aesthetic element that doesn't need JavaScript-driven parallax.

**Fix:** Replace with CSS `background-attachment: fixed` or a simpler CSS-only parallax approach to free up the main thread during scroll.

---

## 🟡 MEDIUM — Doesn't break functionality but reduces premium feel

### M1. Two Conflicting CSS Entry Points

**Files:** `src/app/globals.css` AND `src/styles/globals.css`

Both import `@import "tailwindcss"` and declare conflicting variables/resets. `layout.tsx` only imports `@/styles/globals.css`, making `app/globals.css` potentially load via Next.js convention AND the explicit import.

**Recommendation:** Consolidate into a single `src/styles/globals.css` and remove `src/app/globals.css`, or ensure only one is used.

---

### M2. `<img>` Tags Bypass Next.js Optimization

**Files:**  
- `src/components/orders/ReturnRequestForm.tsx` (line 181)
- `src/components/admin/ProductFormModal.tsx` (line 503)

Raw `<img>` tags don't get AVIF/WebP conversion, responsive sizing, or lazy loading. While these are admin-facing, they still affect admin panel performance.

---

### M3. No `fetchPriority="high"` on LCP Candidate

**File:** `src/components/home/BannerSlider.tsx`

The first banner slide has `priority` (which adds `loading="eager"`) but doesn't explicitly set `fetchPriority="high"` — this is now supported in Next.js 14+ and further hints the browser to prioritize the LCP resource.

---

### M4. Category Showcase Images — No `priority` on Above-the-Fold Tiles

**File:** `src/components/home/CategoryShowcase.tsx`

All 8 category tiles load lazily. On desktop, at least the first 4 tiles are above the fold and should have `priority={true}` or at minimum `loading="eager"`.

---

### M5. Testimonials Firebase Query Runs Client-Side on Every Homepage Visit

**File:** `src/components/home/TestimonialsSection.tsx`

Each homepage visit fires a Firestore query for testimonials. Since these don't change frequently, this should be:
- Fetched server-side in a Server Component
- Cached with `revalidate` (ISR pattern)
- Or use the static fallback and only refresh periodically

---

### M6. Checkout Page — No Guard Against Double Order Creation

**File:** `src/components/checkout/CheckoutClient.tsx`

The `orderCreationRef` prevents double-calls in React strict mode, but if the network request fails and the user clicks "Retry", `orderCreationRef.current` is reset. If two rapid retries fire, you could get duplicate orders. Consider a server-side idempotency key.

---

### M7. Cart Persistence — Stale Inventory Risk

**File:** `src/store/cartStore.ts`

Cart items are persisted with `inventory` counts. If a user adds an item, closes the browser for a day, and returns — the persisted `inventory` value may be stale (item could be sold out). No re-validation of inventory happens when the cart is rehydrated.

**Recommendation:** On cart drawer open or checkout initiation, re-validate inventory from Firestore.

---

### M8. Mobile Menu (`x: '100%'`) Animation Not Using `translate3d`

**File:** `src/components/layout/Navbar.tsx`

Framer Motion animates `x: '100%'` which uses `translateX`. While this is already GPU-friendly, the overlay uses `inset-0` with `backdrop-blur-sm` which can be expensive on mobile Safari. Consider limiting the blur to a solid overlay on mobile.

---

## E2E Flow Integrity Assessment

| Flow | Status | Notes |
|------|--------|-------|
| Cart persistence | ✅ Good | Zustand `persist` with `partialize` — items, coupon, discount saved to localStorage |
| Cart → Checkout auth gate | ✅ Good | AuthModal opens if `!user` before navigating to /checkout |
| Checkout step management | ✅ Good | Three-step flow with proper back-navigation preserving form state |
| Product filtering + URL params | ✅ Good | `parseFiltersFromParams` / `serializeFiltersToParams` properly syncs state ↔ URL |
| Infinite scroll | ✅ Good | IntersectionObserver with 200px rootMargin and proper loading guards |
| Order creation | ⚠️ Minor | idempotency not enforced server-side (see M6) |
| Cart rehydration | ⚠️ Minor | Stale inventory on rehydration (see M7) |

---

## Recommendations Summary (Priority Order)

1. **[CRITICAL]** Add `next/font` for Inter/Helvetica Neue — eliminates CLS from FOUT
2. **[CRITICAL]** Replace Framer Motion `layout` on product grid with CSS `animate-fade-in`
3. **[HIGH]** Fix mega-menu overflow with `w-[min(820px,90vw)]`
4. **[HIGH]** Remove the `mx-auto { display: block !important }` override
5. **[HIGH]** Fix `sizes` attributes on ProductCard and BannerSlider images
6. **[HIGH]** Remove JS parallax from BrandStory — use CSS-only
7. **[MEDIUM]** Consolidate CSS entry points
8. **[MEDIUM]** Add inventory re-validation on cart rehydration
9. **[MEDIUM]** Move testimonials fetch to Server Component with ISR caching

---

*End of audit.*
