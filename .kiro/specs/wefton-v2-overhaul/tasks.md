# Implementation Plan: Wefton Copper V2 Overhaul

## Overview

This plan converts the Wefton Copper platform from a motion-heavy canvas-driven architecture to a performance-first, static-render design using Next.js 16, TypeScript, Tailwind CSS 4, Swiper, next-themes, and Firebase. Tasks are ordered to build foundational styling/theming first, then UI components, then e-commerce services, then analytics, and finally integration wiring.

## Tasks

- [x] 1. Set up Tailwind CSS 4 theme, typography, and dark/light mode foundation
  - [x] 1.1 Update `src/app/globals.css` with Tailwind CSS 4 `@theme` block defining rem typography scale, breakpoints, and dark/light colour tokens using CSS custom properties
    - Define `--font-size-xs` through `--font-size-5xl` in rem values
    - Define `--breakpoint-sm: 375px`, `--breakpoint-md: 768px`, `--breakpoint-lg: 1024px`, `--breakpoint-xl: 1280px`
    - Define `:root` light theme and `.dark` dark theme colour variables (background, foreground, card, border, muted, accent, destructive)
    - Set `overflow-x: hidden` on the root element
    - _Requirements: 2.1, 2.2, 4.2, 5.6, 7.5_

  - [x] 1.2 Install and configure `next-themes` in `src/app/layout.tsx`
    - Wrap children with `ThemeProvider` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`
    - Add `suppressHydrationMismatch` to `<html>` element
    - _Requirements: 5.1, 5.5_

  - [x] 1.3 Create `src/components/layout/ThemeSwitcher.tsx` client component
    - Implement dark → system → light cycle using `useTheme` from next-themes
    - Render appropriate icon (Sun, Moon, Monitor) from lucide-react
    - Handle SSR with mounted state check and placeholder
    - Add `aria-label` for accessibility
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 1.4 Write property test for theme selection (Property 2)
    - **Property 2: Theme selection applies correct class**
    - Test that for any theme in {dark, light, system}, selection applies correct class and persists to localStorage
    - **Validates: Requirements 5.3, 5.4**

  - [x] 1.5 Write property test for colour token contrast ratio (Property 3)
    - **Property 3: Colour token contrast ratio**
    - Test that all text/background colour token pairs meet WCAG 2.1 AA minimum 4.5:1 ratio
    - **Validates: Requirements 5.7**

- [x] 2. Remove canvas hero and Framer Motion, implement Banner Slider
  - [x] 2.1 Remove the HeroSection canvas animation component and all scroll-position calculation logic from `src/components/home/HeroSection.tsx` and any associated imports
    - Remove hero image assets exclusively used for canvas frame sequence
    - Remove Framer Motion imports from `HeroSection.tsx`
    - _Requirements: 16.1, 16.2, 16.4_

  - [x] 2.2 Install Swiper and create `src/components/home/BannerSlider.tsx` client component
    - Define `BannerSlide` interface with id, headline, subheading, ctaText, ctaHref, imageUrl, imageAlt
    - Configure Swiper with Autoplay (5s delay, pauseOnMouseEnter), Pagination (clickable dots), Navigation (arrows)
    - Use Next.js `<Image>` with `priority={true}` for first slide, `loading="lazy"` for subsequent
    - Set aspect ratio `16/7` on mobile, `16/5` on desktop
    - Support 2–6 slides with fallback for invalid count
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 2.3 Write property test for banner slide image priority (Property 1)
    - **Property 1: Banner slide image priority assignment**
    - Test that for any array of 2–6 slides, first slide has `priority={true}` and subsequent have `loading="lazy"`
    - **Validates: Requirements 1.7**

  - [x] 2.4 Remove Framer Motion from Product_Grid, ProductCard, FeaturedProducts, and CategoryShowcase components
    - Replace all Framer Motion entrance animations with immediate CSS `opacity: 1` and `transform: none`
    - Retain Framer Motion only in CartDrawer and AuthModal
    - _Requirements: 15.1, 15.2, 15.4_

  - [x] 2.5 Create `src/components/catalog/ProductGrid.tsx` with CSS Grid layout (no animations)
    - Implement responsive grid: 1 col at 375px, 2 cols at 768px, 3–4 cols at 1024px+
    - Use `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` and `auto-rows-fr`
    - Show skeleton loaders during loading state, transition directly to content without animation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Implement Skeleton Loaders and Fuaark-inspired sections
  - [x] 3.1 Create `src/components/ui/SkeletonLoader.tsx` with variants: product-card, banner, text-block, nav-item
    - Product-card: aspect-[3/4] image + 3 text line placeholders
    - Banner: full-width aspect-[16/7] rectangle
    - Text-block: 3 varied-width lines
    - Nav-item: h-5 w-20 rounded
    - All variants use `animate-pulse` with `bg-muted` colour token
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.2 Write property test for skeleton dimensions match content (Property 4)
    - **Property 4: Skeleton dimensions match content**
    - Test that each skeleton variant's width/height equals the content element it replaces
    - **Validates: Requirements 6.2, 17.4**

  - [x] 3.3 Implement Fuaark-inspired homepage sections in `src/app/page.tsx`
    - Structure homepage in order: BannerSlider, CategoryShowcase, FeaturedProducts, BrandStory, Testimonials, Newsletter
    - Apply bold typography (text-3xl to text-5xl headings), generous vertical spacing (py-16 to py-24)
    - Use placeholder image areas with descriptive text for all image slots
    - Apply consistent section spacing: 4rem (mobile), 6rem (desktop)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 4. Checkpoint — Ensure all UI components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Inventory Service
  - [x] 5.1 Create `src/services/inventoryService.ts` with `decrementInventory` function
    - Use Firestore `runTransaction` for atomic reads + writes
    - Read all product docs, validate stock for each variant
    - If any variant has insufficient stock, throw and abort entire transaction
    - On success, decrement each variant's inventory field by ordered quantity
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 5.2 Add `incrementInventory` function for refund restoration
    - Use Firestore `writeBatch` to increment variant inventory by returned quantity
    - _Requirements: 11.5_

  - [x] 5.3 Write property test for inventory decrement correctness (Property 5)
    - **Property 5: Inventory decrement correctness**
    - Test that for any order with sufficient stock, final inventory = original - ordered quantity for each variant
    - **Validates: Requirements 8.1, 8.2**

  - [x] 5.4 Write property test for inventory insufficient stock rejection (Property 6)
    - **Property 6: Inventory insufficient stock rejection**
    - Test that if any item exceeds stock, entire transaction aborts with no inventory changes
    - **Validates: Requirements 8.3, 8.5**

- [x] 6. Implement Order Email Service
  - [x] 6.1 Create `src/services/orderEmailService.ts` with `isValidEmail`, `buildEmailPayload`, and `generateEmailHtml` functions
    - `isValidEmail`: validates email format, returns false for null/undefined/empty/malformed
    - `buildEmailPayload`: pure function building subject + html per email type (confirmation, shipped, delivered)
    - `generateEmailHtml`: template generation with order details per type
    - _Requirements: 9.2, 9.3, 9.4, 9.6_

  - [x] 6.2 Create API route `src/app/api/send-order-email/route.ts`
    - Validate recipient email before sending
    - Send via Resend API with branded "from" address
    - On failure: log error, retry once after 5s delay, return 502 if retry fails
    - _Requirements: 9.1, 9.5, 9.6_

  - [x] 6.3 Write property test for email validation correctness (Property 8)
    - **Property 8: Email validation correctness**
    - Test that `isValidEmail` returns true only for valid `localpart@domain.tld` format
    - **Validates: Requirements 9.6**

  - [x] 6.4 Write property test for order email content completeness (Property 7)
    - **Property 7: Order email content completeness**
    - Test that each email type includes all required fields (confirmation: order ID, items, total, address, window; shipped: tracking; delivered: review link)
    - **Validates: Requirements 9.2, 9.3, 9.4**

- [x] 7. Implement Return/Refund Flow
  - [x] 7.1 Create `src/services/returnService.ts` with return eligibility, CRUD, and filtering
    - `isReturnEligible`: returns true only if order status is "delivered" AND within 7 days
    - `createReturnRequest`: creates Firestore doc with required fields and status="pending"
    - `updateReturnStatus`: updates status with optional rejectionReason (min 10 chars for rejections)
    - `getReturnsByStatus` and `getCustomerReturns`: query with filtering and sort by createdAt desc
    - _Requirements: 10.1, 10.3, 10.6, 11.3, 11.4, 11.5_

  - [x] 7.2 Create customer return request form component at order history page
    - Show return option only for delivered orders within 7-day window
    - Collect: order ID, items to return, reason (dropdown), comments (optional, max 500 chars)
    - Display confirmation with return request ID and 3–5 business day processing time
    - Display "Return window has expired" when ineligible
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.6_

  - [x] 7.3 Create admin Returns tab in AdminDashboard
    - Table with columns: request ID, customer name, order ID, reason, status, creation date (sorted by createdAt desc)
    - Detail view showing full request details, items, comments, order history
    - Approve, reject (requires reason >= 10 chars), and mark as refunded actions
    - Filter by status: all, pending, approved, rejected, refunded
    - Wire refund action to `incrementInventory`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 7.4 Write property test for return eligibility window (Property 9)
    - **Property 9: Return eligibility window**
    - Test that return is available iff order is "delivered" AND current date minus delivery <= 7 days
    - **Validates: Requirements 10.1, 10.6**

  - [x] 7.5 Write property test for return request document creation (Property 10)
    - **Property 10: Return request document creation**
    - Test that valid submissions create docs with all required fields and status="pending"
    - **Validates: Requirements 10.3**

  - [x] 7.6 Write property test for rejection reason enforcement (Property 11)
    - **Property 11: Return status transition — rejection requires reason**
    - Test that rejections with < 10 char reasons are prevented, >= 10 chars succeed
    - **Validates: Requirements 11.4**

  - [x] 7.7 Write property test for refund inventory restoration (Property 12)
    - **Property 12: Refund restores inventory**
    - Test that refunded items increment variant inventory by returned quantity
    - **Validates: Requirements 11.5**

  - [x] 7.8 Write property test for return request filtering (Property 13)
    - **Property 13: Return request filtering**
    - Test that filtering by status returns only matching requests sorted by createdAt desc
    - **Validates: Requirements 11.1, 11.6**

- [x] 8. Checkpoint — Ensure inventory, email, and return services pass all tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Legal Pages and Admin Coupon CRUD
  - [x] 9.1 Create legal pages at `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/app/refund-policy/page.tsx`
    - Statically rendered with structured content (headings, paragraphs, numbered lists)
    - Include "Last Updated" date at top of each page
    - _Requirements: 12.1, 12.2, 12.5_

  - [x] 9.2 Add legal page links to the Footer component
    - Links to `/terms`, `/privacy`, `/refund-policy` visible on every page
    - _Requirements: 12.3_

  - [x] 9.3 Add Terms of Service acknowledgment checkbox to checkout flow
    - Require checkbox acknowledgment before placing order
    - _Requirements: 12.4_

  - [x] 9.4 Create `src/services/couponService.ts` with CRUD operations and Zod validation schema
    - `getCoupons` with sortable fields (code, discount, expiresAt)
    - `couponCodeExists` for uniqueness check (case-insensitive)
    - `createCoupon` with Zod validation + uniqueness enforcement
    - `updateCoupon` (discount, active, expiresAt only — code is read-only)
    - `deleteCoupon`
    - Define `couponSchema` in `src/lib/schemas.ts`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 9.5 Create admin Coupons tab in AdminDashboard
    - Table with columns: code, discount %, active status, expiry date, actions
    - Create form: code (uppercase, required, unique), discount (1–100), active toggle, optional expiry date
    - Edit form: pre-populated, code field read-only
    - Delete with confirmation dialog
    - Sortable columns (code, discount, expiresAt)
    - _Requirements: 13.1, 13.2, 13.5, 13.6, 13.7_

  - [x] 9.6 Write property test for coupon validation and uniqueness (Property 14)
    - **Property 14: Coupon validation and uniqueness**
    - Test Zod schema accepts valid codes (alphanumeric) + discount 1–100, rejects invalid; duplicate codes fail
    - **Validates: Requirements 13.3, 13.4**

  - [x] 9.7 Write property test for coupon table sorting (Property 15)
    - **Property 15: Coupon table sorting**
    - Test that coupons are returned in correct order for any sort field and direction
    - **Validates: Requirements 13.7**

- [x] 10. Implement GA4 Integration
  - [x] 10.1 Create `src/components/analytics/GA4Provider.tsx` client component
    - Load `gtag.js` with GA4 Measurement ID using Next.js `Script` with `strategy="afterInteractive"`
    - Track `page_view` on route changes via `usePathname`
    - Conditionally render based on `consentGranted` prop — do not load if consent denied
    - _Requirements: 14.1, 14.2, 14.6_

  - [x] 10.2 Create `src/lib/analytics.ts` with GA4 event helper functions
    - `trackEvent`: generic event dispatcher, only fires when `window.gtag` exists
    - `trackAddToCart`: item_id, item_name, price, currency=INR, quantity
    - `trackPurchase`: transaction_id, value, currency=INR, items, shipping
    - `trackViewItem`: item_id, item_name, price, currency=INR
    - _Requirements: 14.3, 14.4, 14.5_

  - [x] 10.3 Wire GA4 events into existing cart, checkout, and product detail components
    - Call `trackAddToCart` in cart add handler
    - Call `trackPurchase` after successful checkout
    - Call `trackViewItem` on product detail page mount
    - _Requirements: 14.3, 14.4, 14.5_

  - [x] 10.4 Write property test for GA4 event payload correctness (Property 16)
    - **Property 16: GA4 event payload correctness**
    - Test that each trackable action dispatches event with all required params, currency=INR, and only when consent granted
    - **Validates: Requirements 14.2, 14.3, 14.4, 14.5, 14.6**

- [x] 11. Responsive layout polish and performance verification
  - [x] 11.1 Audit and fix all remaining `vw`-based font sizes across the codebase to use rem values with Tailwind responsive prefixes
    - Ensure no horizontal overflow at any viewport 375px–2560px
    - _Requirements: 2.1, 2.3, 2.4_

  - [x] 11.2 Verify responsive layout stability at all breakpoints
    - Mobile (375px–767px): single-column, 100% width, 1rem horizontal padding
    - Tablet (768px–1023px): tablet-optimised, 100% width, 2rem horizontal padding
    - Desktop (1024px+): max-width 1280px centered
    - Ensure no child element exceeds 100vw
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6_

  - [x] 11.3 Ensure Framer Motion is fully removed from production bundle for product components
    - Verify bundle size decrease (approx 30–40 KB gzipped)
    - Confirm Framer Motion retained only in CartDrawer/AuthModal
    - _Requirements: 15.3, 15.4_

  - [x] 11.4 Add skeleton loaders for all above-the-fold async content
    - Ensure CLS ≤ 0.1 target via matching skeleton/content dimensions
    - Ensure zero font-size recalculations after initial render
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [~] 12. Final checkpoint — Ensure all tests pass and integration is complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check (min 100 iterations)
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementations follow the interfaces defined in the design document
- Swiper, next-themes, and Resend are new dependencies to install
- Framer Motion should NOT be uninstalled — it is retained for CartDrawer and AuthModal

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "3.1"] },
    { "id": 2, "tasks": ["1.4", "1.5", "2.2", "2.4", "3.2"] },
    { "id": 3, "tasks": ["2.3", "2.5", "3.3"] },
    { "id": 4, "tasks": ["5.1", "6.1", "7.1", "9.1", "9.4"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "6.2", "6.3", "6.4", "7.2", "9.2", "9.3", "9.5"] },
    { "id": 6, "tasks": ["7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "9.6", "9.7"] },
    { "id": 7, "tasks": ["10.1", "10.2"] },
    { "id": 8, "tasks": ["10.3", "10.4"] },
    { "id": 9, "tasks": ["11.1", "11.2", "11.3", "11.4"] }
  ]
}
```
