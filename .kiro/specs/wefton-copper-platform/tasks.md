# Implementation Plan: Wefton Copper Premium E-Commerce Platform

## Overview

This implementation plan converts the Wefton Copper platform design into incremental coding tasks. The platform is built on Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion, Firebase (Auth/Firestore/Storage), and Zustand. Tasks are ordered to build foundational infrastructure first, then core services, UI components, and finally integration/testing layers.

## Tasks

- [x] 1. Set up project infrastructure and core configuration
  - [x] 1.1 Configure Firebase lazy initialization and environment variables
    - Implement `src/lib/firebase.ts` with lazy getters for `app`, `auth`, `db`, and `storage`
    - Read all config from `NEXT_PUBLIC_FIREBASE_*` environment variables
    - Log descriptive errors if required env vars are missing; return `null` gracefully
    - Create `.env.local.example` with all required keys and placeholder values
    - Add `NEXT_PUBLIC_UPI_QR_IMAGE_URL` and `NEXT_PUBLIC_UPI_ID` entries
    - _Requirements: 39.1, 39.2, 39.3, 39.4, 39.5_

  - [x] 1.2 Set up Zustand stores with persistence and TypeScript interfaces
    - Implement `cartStore` with all methods from the `CartStore` interface (addItem, removeItem, updateQuantity, clearCart, openCart, closeCart, applyCoupon, removeCoupon, getSubtotal, getShipping, getTax, getTotal)
    - Implement `authStore` with `user`, `loading`, `setUser`, `setLoading`, `isAdmin`
    - Implement `wishlistStore` with `toggle`, `has`, `syncFromFirestore`, `clear` and localStorage persistence
    - Implement `searchStore` with `query`, `isOpen`, `history` (capped at 5), `setQuery`, `openSearch`, `closeSearch`, `addToHistory`, `clearHistory`
    - Configure Zustand `persist` middleware with localStorage for cart and wishlist
    - _Requirements: 19.1–19.10, 31.1, 32.4, 32.8_

  - [x] 1.3 Define TypeScript types and Zod validation schemas
    - Define/verify all types in `src/types/index.ts`: `Product`, `ProductVariant`, `ProductImage`, `User`, `Order`, `Review`, `CartItem`, `Coupon`, `NewsletterSubscriber`, `FilterState`
    - Create Zod schemas: `addressSchema` (name, phone 10-digit, line1, city, state, pincode 6-digit), `reviewSchema` (rating 1–5 integer, comment 10–500 chars), `emailSchema`, `fileUploadSchema` (type in jpeg/png/webp, size ≤ 5MB)
    - Create `formatPrice` utility function using `Intl.NumberFormat('en-IN')` with INR currency, no decimals
    - _Requirements: 21.3, 22.5, 22.6, 15.6, 23.6, 26.3, 38.1_

  - [x] 1.4 Set up Vitest and fast-check testing infrastructure
    - Install and configure Vitest with TypeScript support
    - Install `fast-check` for property-based testing
    - Create test directory structure: `src/__tests__/properties/`, `src/__tests__/unit/`, `src/__tests__/integration/`
    - Configure Vitest config with path aliases matching `tsconfig.json`
    - _Requirements: 40.3_

- [x] 2. Implement Firebase service layer
  - [x] 2.1 Implement product service (`src/services/productService.ts`)
    - Implement `getProductBySlug(slug)` — query Firestore `products` where `slug == slug`, return first match or `null`
    - Implement `getFeaturedProducts(count=8)` — query `products` where `featured == true`, order by `createdAt` desc, limit `count`
    - Implement `getProductsByGender(gender, filters, cursor?)` — compound query with filters (category, price range, rating, availability, newArrivals, bestsellers), sort, and pagination cursor
    - Implement `getSimilarProducts(category, excludeId, count=4)` — query same category excluding current product
    - Implement `searchProducts(query)` — search by title, category, and tags (client-side filter on fetched docs or Firestore array-contains)
    - Implement `createProduct(data)`, `updateProduct(id, data)`, `deleteProduct(id)` for admin CRUD
    - _Requirements: 3.1, 7.1, 9.1, 9.2, 14.1, 27.2, 27.4, 32.2_

  - [x] 2.2 Implement order service (`src/services/orderService.ts`)
    - Implement `createOrder(userId, items, address, discount?)` — write to Firestore `orders` with `paymentStatus: "pending"`, `orderStatus: "placed"`, server timestamp
    - Implement `uploadPaymentScreenshot(orderId, file, reference)` — upload to Storage `payments/{orderId}/{filename}`, update order `paymentStatus: "uploaded"` and `paymentScreenshot` URL
    - Implement `getUserOrders(userId)` — query orders where `userId == userId`, order by `createdAt` desc
    - Implement `getAllOrders()` — fetch all orders for admin
    - Implement `updateOrderStatus(docId, orderStatus, paymentStatus?)` — update status fields with `updatedAt: serverTimestamp()`
    - _Requirements: 23.1, 23.5, 24.3, 24.4, 25.2, 25.4, 29.1_

  - [x] 2.3 Implement auth service (`src/services/authService.ts`)
    - Implement `signInWithGoogle()` — `signInWithPopup` with `GoogleAuthProvider`, call `upsertUserDoc`
    - Implement `signInWithFacebook()` — `signInWithPopup` with `FacebookAuthProvider`, call `upsertUserDoc`
    - Implement `signUpWithEmail(name, email, password)` — `createUserWithEmailAndPassword`, `updateProfile`, call `upsertUserDoc`
    - Implement `signInWithEmail(email, password)` — `signInWithEmailAndPassword`
    - Implement `resetPassword(email)` — `sendPasswordResetEmail`
    - Implement `sendOTP(phone, recaptchaVerifier)` — `signInWithPhoneNumber`
    - Implement `verifyOTP(confirmationResult, otp)` — `confirm(otp)`, call `upsertUserDoc`
    - Implement `logout()` — `signOut`
    - Implement `upsertUserDoc(user)` — check if `users/{uid}` exists, create with `role: "user"` if not
    - _Requirements: 16.1–16.8, 17.1, 17.2_

  - [x] 2.4 Implement coupon service (`src/services/couponService.ts`)
    - Implement `validateCoupon(code)` — query Firestore `coupons` where `code == code.toUpperCase()` and `active == true`
    - Check `expiresAt` — if set and in the past, return `{ valid: false, error: "Coupon has expired" }`
    - If not found, return `{ valid: false, error: "Invalid coupon code" }`
    - If valid, return `{ valid: true, discount: doc.discount }`
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [x] 2.5 Implement review service (`src/services/reviewService.ts`)
    - Implement `getProductReviews(productId)` — query `reviews` where `productId == productId`, order by `createdAt` desc
    - Implement `addReview(review)` — write to `reviews` collection, atomically update product `ratings` and `reviewsCount`
    - Implement `markHelpful(reviewId)` — increment `helpful` field
    - _Requirements: 15.1, 15.3, 15.4, 15.7_

  - [x] 2.6 Implement newsletter service (`src/services/newsletterService.ts`)
    - Implement `subscribeNewsletter(email)` — check if email exists in `newsletter_subscribers`, if yes return "You are already subscribed"
    - If new, write `{ email, subscribedAt: serverTimestamp() }` to `newsletter_subscribers`
    - Return `{ success: true, message: "Successfully subscribed!" }`
    - _Requirements: 6.2, 6.4_

- [x] 3. Checkpoint - Ensure all services compile and types are correct
  - Ensure all tests pass, ask the user if questions arise.


- [x] 4. Implement authentication and protected route infrastructure
  - [x] 4.1 Implement Auth state listener and `useAuth` hook
    - Create `src/hooks/useAuth.ts` that subscribes to `onAuthStateChanged`
    - On auth state change, fetch user doc from Firestore and populate `authStore`
    - Expose `{ user, loading, isAdmin }` from the hook
    - Configure `browserLocalPersistence` for session persistence
    - _Requirements: 17.1, 17.2, 17.5_

  - [x] 4.2 Implement AuthModal component with all sign-in flows
    - Create `src/components/AuthModal.tsx` with tabs/views for Google, Facebook, Phone OTP, and Email/Password
    - Implement Google sign-in button calling `signInWithGoogle`
    - Implement Facebook sign-in button calling `signInWithFacebook`
    - Implement phone OTP flow: phone input → invisible reCAPTCHA → OTP entry screen
    - Implement email/password sign-in and sign-up forms with Zod validation (email format, password ≥ 8 chars)
    - Implement "Forgot password?" link and reset flow
    - Handle errors: popup blocked, invalid OTP, user not found
    - Close modal and update authStore on successful auth
    - _Requirements: 16.1–16.8, 18.1–18.4_

  - [x] 4.3 Implement route protection middleware
    - Create a `ProtectedRoute` wrapper component that checks auth state
    - Redirect unauthenticated users from `/account`, `/checkout`, `/wishlist` to homepage with AuthModal open
    - Redirect non-admin users from `/admin` to homepage
    - _Requirements: 17.3, 17.4, 21.5, 24.5_

- [x] 5. Implement cart and checkout flow
  - [x] 5.1 Implement CartDrawer component
    - Create `src/components/CartDrawer.tsx` with Framer Motion slide-in from right (300ms)
    - Render cart items with image, title, size, colour, price, quantity stepper, remove button
    - Implement quantity cap at inventory level with "Max quantity reached" message
    - Display free shipping progress bar (threshold ₹999) or "Free shipping unlocked!" message
    - Display order summary: subtotal, discount, shipping (₹99 or free), GST (5%), total
    - Implement coupon input field with "Apply" button calling `applyCoupon` (Firestore-backed)
    - Display inline error for invalid/expired coupons
    - "Proceed to Checkout" button — check auth, open AuthModal if needed, navigate to `/checkout`
    - Use `dynamic()` with `{ ssr: false }` for lazy loading
    - _Requirements: 19.1–19.10, 35.6_

  - [x] 5.2 Implement CheckoutClient — Step 1: Delivery Address
    - Create `src/components/checkout/CheckoutClient.tsx` with 3-step wizard and step indicator
    - Implement address form with fields: Full Name, Phone, Line 1, Line 2, City, State, PIN Code, Country
    - Display saved addresses as selectable cards (fetch from `users/{uid}.addresses`)
    - Pre-fill form on saved address selection
    - Validate with Zod addressSchema on "Continue to Payment"
    - "Save this address" checkbox — append to Firestore `users/{uid}.addresses` with generated `addressId`
    - Preserve address data on back navigation from Step 2
    - _Requirements: 21.1–21.5, 22.1–22.6_

  - [x] 5.3 Implement CheckoutClient — Step 2: QR Payment
    - Display UPI QR code from `NEXT_PUBLIC_UPI_QR_IMAGE_URL` and UPI ID from `NEXT_PUBLIC_UPI_ID`
    - Call `createOrder` on reaching Step 2, display generated `orderId` and exact amount
    - Display payment instructions with order ID as reference
    - Implement file upload input (JPEG/PNG/WebP, ≤ 5MB) with client-side validation
    - On upload + reference entry, call `uploadPaymentScreenshot`
    - Display error for invalid file type/size
    - Advance to Step 3 on successful upload
    - _Requirements: 23.1–23.8_

  - [x] 5.4 Implement CheckoutClient — Step 3: Order Confirmation
    - Display order ID, itemised summary, total paid, estimated delivery (5–7 business days)
    - Call `cartStore.clearCart()` on reaching this step
    - Display success animation/message
    - _Requirements: 21.6_

- [x] 6. Implement product display components
  - [x] 6.1 Implement ProductCard component
    - Create `src/components/ProductCard.tsx` displaying: image, title, price (₹), compare price strikethrough, rating stars, review count, availability
    - Calculate and display discount percentage badge when `comparePrice > price`
    - Display "New" badge for `newArrival == true`, "Bestseller" badge for `bestseller == true`
    - Display "Out of Stock" overlay when `inventory == 0`, disable "Add to Cart"
    - Implement hover image swap (secondary image) with CSS transition
    - Implement wishlist icon toggle with optimistic update via `wishlistStore`
    - _Requirements: 8.1–8.7_

  - [x] 6.2 Implement ProductDetailClient — main structure and image gallery
    - Create `src/components/product/ProductDetailClient.tsx`
    - Fetch product by slug, render `notFound()` if null
    - Implement image gallery: primary display + thumbnail row
    - Thumbnail click updates primary image with crossfade transition
    - Desktop hover zoom on primary image
    - Touch swipe navigation for mobile
    - All images with proper alt text for WCAG 2.1 AA
    - Render JSON-LD `Product` structured data in page head
    - _Requirements: 9.1–9.4, 10.1–10.5, 36.4_

  - [x] 6.3 Implement ProductDetailClient — variant selection and add to cart
    - Render size selector buttons for all sizes with inventory > 0
    - Disabled/strikethrough for sizes with inventory == 0
    - Colour swatches using `colorHex`, update selected colour and inventory display
    - Show "Only X left" when inventory ≤ 5
    - Validate size selection before add to cart ("Please select a size" message)
    - "Add to Cart" button — add to cartStore, open CartDrawer
    - Disable "Add to Cart" when max quantity reached
    - Wishlist toggle with auth check (open AuthModal if unauthenticated)
    - "Share" button — copy URL to clipboard, show "Link copied" toast
    - Display delivery info: ₹99 shipping, free above ₹999, 5–7 business days
    - _Requirements: 11.1–11.5, 12.1–12.5, 13.1–13.3_

  - [x] 6.4 Implement ProductDetailClient — reviews section
    - Fetch reviews with `getProductReviews`, display sorted by `createdAt` desc
    - Render aggregate rating: average, total count, star distribution bar chart
    - Render each review: name, avatar/initials, stars, comment, verified badge, helpful count, relative time
    - "Helpful" button with optimistic increment via `markHelpful`
    - "Load more reviews" button (paginate after 5)
    - Review submission form: rating (1–5), comment (10–500 chars), Zod validation
    - Auth check before submit (open AuthModal if needed, preserve form)
    - Set `verified: true` if user has purchased the product
    - _Requirements: 15.1–15.9_

  - [x] 6.5 Implement Similar Products section
    - Fetch up to 4 products from same category (excluding current) via `getSimilarProducts`
    - Render as horizontal scrollable row of ProductCard components
    - Hide section if fewer than 2 similar products
    - _Requirements: 14.1–14.3_


- [x] 7. Checkpoint - Ensure product and checkout components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement collection pages and search
  - [x] 8.1 Implement CollectionPage with filtering and sorting
    - Create `src/components/collection/CollectionPage.tsx` shared for `/men` and `/women`
    - Implement FilterSidebar: category multi-select, price range slider, min rating, availability toggle, new arrivals toggle, bestsellers toggle
    - Implement sort options: newest (default), price-asc, price-desc, rating, bestseller
    - Reset pagination cursor on filter/sort change, reload within 500ms
    - Implement infinite scroll pagination (next 12 products at 200px from bottom)
    - Grid/list view toggle (3 cols desktop, 2 tablet, 1 mobile for grid; single col for list)
    - "No products found" message with "Clear Filters" button
    - FilterSidebar: persistent on desktop ≥ 1024px, slide-over drawer on mobile
    - Active filter count badge on mobile "Filter" button
    - Restore scroll position and filter state from URL query params on back navigation
    - _Requirements: 7.1–7.10_

  - [x] 8.2 Implement SearchOverlay component
    - Create `src/components/SearchOverlay.tsx` — full viewport overlay on search icon click
    - Debounce input by 300ms before calling `searchProducts`
    - Display up to 20 results with image, title, category, price
    - Empty query state: show recent history (from searchStore, max 5) and trending terms (from Firestore `search_config`)
    - Navigate to product detail on result click, close overlay
    - Enter key navigates to `/search?q={query}` with CollectionPage layout
    - "No products found" message with collection suggestions
    - Update searchStore history on search (prepend, deduplicate, cap at 5)
    - Close on Escape key or outside click
    - Use `dynamic()` with `{ ssr: false }` for lazy loading
    - _Requirements: 32.1–32.9, 35.6_

- [x] 9. Implement landing page components
  - [x] 9.1 Implement HeroSection with scroll-driven canvas animation
    - Create `src/components/home/HeroSection.tsx` with full-viewport canvas
    - Load at least 5 product images, advance frame proportional to scroll offset
    - Display brand tagline and CTA button linking to `/men` or `/women`
    - Respect `prefers-reduced-motion: reduce` — show static image fallback
    - Use Next.js `<Image>` with `priority`, WebP format, explicit dimensions
    - Fallback to CSS-animated static image if canvas context fails
    - _Requirements: 1.1–1.6_

  - [x] 9.2 Implement CategoryShowcase component
    - Create `src/components/home/CategoryShowcase.tsx` with 6+ category tiles
    - Each tile: category image (from Firebase Storage), name, link to filtered collection
    - Navigate to `/men` or `/women` with category filter query param on click
    - Branded placeholder on image load failure
    - Responsive: 2 cols mobile, 3 cols tablet, 4 cols desktop
    - _Requirements: 2.1–2.5_

  - [x] 9.3 Implement FeaturedProducts component
    - Create `src/components/home/FeaturedProducts.tsx`
    - Fetch up to 8 products where `featured == true` via `getFeaturedProducts`
    - Render using ProductCard components
    - "Coming Soon" placeholder when no featured products exist
    - "Add to Cart" on ProductCard adds default variant and opens CartDrawer
    - Framer Motion viewport entrance animations
    - _Requirements: 3.1–3.5_

  - [x] 9.4 Implement BrandStory component
    - Create `src/components/home/BrandStory.tsx`
    - Display 5 differentiators: serial number, plastic-free packaging, seed bag, fabric freshener, finger brush
    - Icon/illustration + short text (≤ 40 words) per item
    - Copper-stitched craftsmanship section
    - Framer Motion staggered entrance (100ms delay per card) on viewport entry
    - _Requirements: 4.1–4.4_

  - [x] 9.5 Implement TestimonialsSection component
    - Create `src/components/home/TestimonialsSection.tsx`
    - Display 3+ testimonials: name, star rating, text, verified badge
    - Source from Firestore `reviews` (verified == true) or static fallback
    - Auto-advancing carousel (5s interval) with navigation dots when > 3
    - Pause on hover/focus for accessibility
    - _Requirements: 5.1–5.4_

  - [x] 9.6 Implement NewsletterForm component
    - Create `src/components/NewsletterForm.tsx` with email input + "Subscribe" button
    - Zod email validation with inline error "Please enter a valid email address"
    - Call `subscribeNewsletter` on valid submit
    - Display "You are already subscribed" for duplicates
    - Loading spinner and disabled button during submission
    - Success confirmation message
    - _Requirements: 6.1–6.5_

- [x] 10. Implement admin dashboard
  - [x] 10.1 Implement AdminDashboard layout and stats panel
    - Create `src/components/admin/AdminDashboard.tsx` with tab navigation (Orders, Products, Stats)
    - Implement `AdminStats` panel: total orders, total revenue, total products, total users, pending orders, pending payments
    - Calculate revenue from orders where `paymentStatus == "verified"`
    - Display revenue in INR with `en-IN` locale formatting
    - "Refresh" button to re-query stats
    - Admin role check — redirect non-admins to homepage
    - _Requirements: 26.1–26.3, 24.5_

  - [x] 10.2 Implement AdminDashboard — Orders tab with payment verification
    - "Pending Payments" sub-tab: list orders where `paymentStatus == "uploaded"`, sorted by `createdAt` asc
    - Order detail view: order ID, customer name, total, items, address, payment screenshot (clickable image), UPI reference
    - "Approve Payment" button → `updateOrderStatus` with `paymentStatus: "verified"`, `orderStatus: "confirmed"`
    - "Reject Payment" button → `updateOrderStatus` with `paymentStatus: "failed"`, `orderStatus: "cancelled"`
    - "All Orders" sub-tab: list all orders with columns (ID, customer, date, total, payment status, order status)
    - Order status dropdown: placed, confirmed, processing, shipped, delivered, cancelled
    - Tracking number input when status set to "shipped"
    - Real-time updates via Firestore `onSnapshot` listeners
    - _Requirements: 24.1–24.5, 25.1–25.5_

  - [x] 10.3 Implement AdminDashboard — Products tab with CRUD
    - Products list: thumbnail, title, category, gender, price, inventory, badges
    - "Add Product" button → product form modal
    - Product form: title, slug (auto-generated, editable), description, short description, category dropdown, gender, tags, price, compare price, inventory, SKU, featured/bestseller/new arrival toggles
    - Image upload to Firebase Storage `products/{productId}/{filename}`, populate `images` array
    - Variant management: add/remove variants with size, colour, colorHex, price override, inventory, SKU
    - Zod validation before `createProduct` / `updateProduct`
    - "Edit" button pre-fills form with existing data
    - "Delete" button with confirmation dialog → `deleteProduct`
    - Slug uniqueness check with error message
    - _Requirements: 27.1–27.8_


- [x] 11. Implement user account and wishlist pages
  - [x] 11.1 Implement AccountClient — Profile tab
    - Create `src/components/account/AccountClient.tsx` with tabs: Profile, Orders, Addresses
    - Display name, email, phone, avatar
    - "Save" button for name update → Firebase Auth `updateProfile` + Firestore `users/{uid}.name`
    - Avatar upload → Storage `avatars/{uid}/{filename}`, update `photoURL` and Firestore `avatar`
    - Protected route — redirect unauthenticated to homepage with AuthModal
    - _Requirements: 28.1–28.4_

  - [x] 11.2 Implement AccountClient — Order History tab
    - Fetch orders via `getUserOrders(uid)`, display sorted by `createdAt` desc
    - Each order: ID, date, items (image, title, size, colour, qty, price), subtotal, shipping, GST, total, payment badge, status badge
    - Colour-coded status badges: placed=grey, confirmed=blue, processing=yellow, shipped=purple, delivered=green, cancelled=red
    - Tracking number with copy-to-clipboard when shipped
    - "No orders yet" empty state with homepage link
    - _Requirements: 29.1–29.5_

  - [x] 11.3 Implement AccountClient — Saved Addresses tab
    - Display all addresses from `users/{uid}.addresses` as cards
    - "Add Address" form (same Zod schema as checkout)
    - Save new address with UUID `addressId` to Firestore
    - "Set as Default" button — update `isDefault` flags
    - "Delete" button — remove from Firestore array
    - _Requirements: 30.1–30.5_

  - [x] 11.4 Implement WishlistClient page
    - Create `src/components/wishlist/WishlistClient.tsx`
    - Fetch wishlist product IDs from `wishlistStore`, resolve full Product docs from Firestore
    - Render as ProductCard grid with "Add to Cart" and "Remove from Wishlist" buttons
    - Sync with Firestore `users/{uid}.wishlist` for authenticated users
    - "Out of Stock" badge and disabled "Add to Cart" for zero-inventory items
    - "Your wishlist is empty" state with homepage link
    - _Requirements: 31.1–31.6_

- [x] 12. Implement brand pages and SEO
  - [x] 12.1 Implement VisionClient page
    - Create `src/components/brand/VisionClient.tsx`
    - Render 6 brand promise sections: Authenticity Serial Number, Plastic-Free Packaging, Organic Fabric Freshener, Seed Bag, Finger Brush, Copper-Stitched Craftsmanship
    - Each section: title, 50–150 word paragraph, icon/image
    - Framer Motion staggered entrance on scroll
    - Authenticity serial number verification process explanation
    - _Requirements: 33.1–33.4_

  - [x] 12.2 Implement AboutClient page
    - Create `src/components/brand/AboutClient.tsx`
    - Brand timeline with 3+ milestones (year, title, description)
    - Mission statement and sustainability/ethical manufacturing section
    - Contact info: email, phone, social media links (Instagram, Facebook, Twitter)
    - _Requirements: 34.1–34.3_

  - [x] 12.3 Implement SEO metadata and structured data
    - Add `generateMetadata` to every page route (title, description, openGraph, twitter)
    - All titles follow pattern `{Page Name} | Wefton Copper`
    - Create `/sitemap.xml` route with all product, collection, and brand page URLs
    - Create `/robots.txt` allowing crawlers on public pages, disallowing `/admin` and `/account`
    - Add JSON-LD `Organization` schema on homepage
    - _Requirements: 36.1–36.6_

- [x] 13. Implement security rules and performance optimizations
  - [x] 13.1 Write Firestore security rules
    - `users/{uid}`: authenticated owner read/write only
    - `orders`: authenticated create with `userId == auth.uid`, owner read, admin read/update all
    - `products`: public read, admin-only write
    - `reviews`: public read, authenticated create with `userId == auth.uid`
    - `coupons`: public read, admin-only write
    - `newsletter_subscribers`: authenticated create, admin read
    - _Requirements: 37.1–37.6_

  - [x] 13.2 Write Firebase Storage security rules
    - `payments/{orderId}/`: authenticated write only if orderId matches user's order
    - `avatars/{uid}/`: authenticated write only if `uid == auth.uid`
    - `products/`: admin-only write
    - _Requirements: 37.7–37.9_

  - [x] 13.3 Implement performance optimizations
    - Configure ISR with 3600s revalidation for product detail pages
    - Implement `generateStaticParams` for `/men`, `/women`, `/new-arrivals`, `/bestsellers`
    - All images: WebP/AVIF via Next.js `<Image>`, `loading="lazy"` for below-fold
    - `dynamic()` with `{ ssr: false }` for CartDrawer, SearchOverlay, AuthModal
    - Ensure XSS protection: no raw HTML rendering of user content
    - _Requirements: 35.1–35.6, 38.2, 38.3_

  - [x] 13.4 Implement CI/CD GitHub Actions workflow
    - Create `.github/workflows/ci.yml` — run on PR to `main`: `tsc --noEmit`, ESLint
    - Create `.github/workflows/deploy.yml` — deploy on push to `main` after checks pass
    - Ensure zero TypeScript errors and zero ESLint errors
    - _Requirements: 40.1–40.4_

- [x] 14. Checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Property-based tests for correctness properties
  - [x] 15.1 Write property test for cart arithmetic invariant
    - **Property 1: Cart arithmetic invariant**
    - Test that for any set of cart items, discount percentage, and platform constants, total == subtotal - discountAmount + shipping + tax
    - Use fast-check arbitraries for item arrays (price > 0, quantity > 0) and discount (0–100)
    - **Validates: Requirements 19.6, 23.3**

  - [x] 15.2 Write property test for cart quantity cap
    - **Property 2: Cart quantity never exceeds inventory**
    - Test that after any sequence of addItem/updateQuantity operations, quantity ≤ inventory
    - Use fast-check arbitraries for inventory values and operation sequences
    - **Validates: Requirements 19.3, 12.2**

  - [x] 15.3 Write property test for discount percentage calculation
    - **Property 3: Discount percentage calculation**
    - Test that discount badge == Math.round(((comparePrice - price) / comparePrice) * 100) when comparePrice > price, else 0
    - Use fast-check arbitraries for price and comparePrice values
    - **Validates: Requirements 8.2**

  - [x] 15.4 Write property test for coupon validation logic
    - **Property 4: Coupon validation logic**
    - Test valid/invalid/expired coupon scenarios against the validateCoupon function
    - Mock Firestore responses with fast-check generated coupon documents
    - **Validates: Requirements 20.2, 20.3**

  - [x] 15.5 Write property test for address form validation
    - **Property 5: Address form validation**
    - Test that addressSchema passes only for valid inputs (non-empty name, 10-digit phone, non-empty line1/city/state, 6-digit pincode)
    - Use fast-check arbitraries for valid and invalid address objects
    - **Validates: Requirements 21.3, 22.5, 22.6**

  - [x] 15.6 Write property test for file upload validation
    - **Property 6: File upload validation**
    - Test that validator accepts only jpeg/png/webp files ≤ 5MB, rejects all others
    - Use fast-check arbitraries for file type strings and size numbers
    - **Validates: Requirements 23.6**

  - [x] 15.7 Write property test for review form validation
    - **Property 7: Review form validation**
    - Test that reviewSchema passes only for rating 1–5 integer and comment 10–500 chars
    - Use fast-check arbitraries for rating and comment values
    - **Validates: Requirements 15.6**

  - [x] 15.8 Write property test for search history invariants
    - **Property 8: Search history invariants**
    - Test that after any sequence of addToHistory calls: most recent at index 0, no duplicates, max length 5, no empty strings
    - Use fast-check arbitraries for query string sequences
    - **Validates: Requirements 32.8**

  - [x] 15.9 Write property test for sort ordering invariant
    - **Property 9: Sort ordering invariant**
    - Test that after sorting by any option, adjacent pairs satisfy the ordering predicate
    - Use fast-check arbitraries for product arrays and sort options
    - **Validates: Requirements 7.3**

  - [x] 15.10 Write property test for active filter count
    - **Property 10: Active filter count**
    - Test that filter count equals number of fields differing from defaults
    - Use fast-check arbitraries for FilterState objects
    - **Validates: Requirements 7.9**

  - [x] 15.11 Write property test for aggregate rating calculation
    - **Property 11: Aggregate rating calculation**
    - Test that average == Σ(ratings)/count rounded to 1 decimal, and star distribution counts are correct
    - Use fast-check arbitraries for review arrays with ratings 1–5
    - **Validates: Requirements 15.2**

  - [x] 15.12 Write property test for admin revenue statistics
    - **Property 12: Admin revenue statistics**
    - Test totalRevenue, pendingOrders, pendingPayments calculations against order arrays
    - Use fast-check arbitraries for order arrays with various statuses
    - **Validates: Requirements 26.1**

  - [x] 15.13 Write property test for variant availability
    - **Property 13: Variant availability reflects inventory**
    - Test that size buttons are enabled iff at least one variant with that size has inventory > 0
    - Use fast-check arbitraries for variant arrays
    - **Validates: Requirements 11.1, 11.2**

  - [x] 15.14 Write property test for formatPrice locale formatting
    - **Property 14: formatPrice locale formatting**
    - Test that output starts with "₹", has no decimals, uses Indian numbering grouping
    - Use fast-check arbitraries for non-negative numbers
    - **Validates: Requirements 26.3**

  - [x] 15.15 Write property test for order status badge color mapping
    - **Property 15: Order status badge color mapping**
    - Test that every valid status maps to exactly one defined color, no undefined mappings
    - Use fast-check `oneof` for all valid status values
    - **Validates: Requirements 29.4**

- [x] 16. Final checkpoint - Ensure all tests pass and build succeeds
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The platform uses TypeScript throughout — all code examples and implementations use TypeScript
- Firebase services use lazy initialization to avoid SSR build errors
- Zustand stores persist to localStorage for offline cart/wishlist functionality

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3", "1.4"] },
    { "id": 1, "tasks": ["1.2", "2.3", "2.4", "2.5", "2.6"] },
    { "id": 2, "tasks": ["2.1", "2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "6.1"] },
    { "id": 4, "tasks": ["5.1", "6.2", "6.3", "9.6"] },
    { "id": 5, "tasks": ["5.2", "5.3", "6.4", "6.5", "9.1", "9.2"] },
    { "id": 6, "tasks": ["5.4", "8.1", "8.2", "9.3", "9.4", "9.5"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3", "11.1", "11.4"] },
    { "id": 8, "tasks": ["11.2", "11.3", "12.1", "12.2"] },
    { "id": 9, "tasks": ["12.3", "13.1", "13.2", "13.3"] },
    { "id": 10, "tasks": ["13.4"] },
    { "id": 11, "tasks": ["15.1", "15.2", "15.3", "15.4", "15.5", "15.6", "15.7", "15.8", "15.9", "15.10", "15.11", "15.12", "15.13", "15.14", "15.15"] }
  ]
}
```
