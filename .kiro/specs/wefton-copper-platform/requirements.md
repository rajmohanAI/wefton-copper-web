# Requirements Document

## Introduction

Wefton Copper is a premium Indian fashion brand specialising in Micro-French Terry essentials for men and women. This document defines the complete functional and non-functional requirements for the Wefton Copper e-commerce platform built on Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion, Firebase (Auth / Firestore / Storage), and Zustand.

The platform scaffolding — pages, components, services, and stores — already exists. These requirements govern what must be fully implemented, wired to live Firebase data, and verified as production-ready. Key gaps include: Firebase data integration for several UI components, admin product management completion, a customer-facing review UI, real UPI QR code configuration, and coupon management via Firestore.

---

## Glossary

- **Platform**: The Wefton Copper Next.js 15 web application.
- **Customer**: An authenticated or guest end-user browsing or purchasing products.
- **Admin**: An authenticated user with `role: "admin"` in Firestore who manages orders and products.
- **Product**: A Wefton Copper garment document stored in the Firestore `products` collection, typed as `Product` in `src/types/index.ts`.
- **Variant**: A size/colour combination of a Product, typed as `ProductVariant`.
- **Cart**: The in-memory and persisted shopping cart managed by `cartStore` (Zustand + localStorage).
- **Order**: A Firestore document in the `orders` collection representing a placed purchase, typed as `Order`.
- **QR Payment**: The UPI QR-based payment flow where the Customer scans a QR code, pays, uploads a screenshot, and the Admin verifies.
- **Review**: A Firestore document in the `reviews` collection representing a Customer's rating and comment on a Product, typed as `Review`.
- **Coupon**: A Firestore document in the `coupons` collection defining a discount code and percentage.
- **AuthModal**: The modal component handling all authentication flows (Google, Facebook, Phone OTP, Email/Password).
- **CartDrawer**: The slide-over panel displaying cart items, coupon input, and order summary.
- **AdminDashboard**: The `/admin` page restricted to Admin users for order and product management.
- **HeroSection**: The homepage component featuring a scroll-driven canvas animation of product imagery.
- **GST**: Goods and Services Tax at 5%, applied to the post-discount subtotal.
- **INR**: Indian Rupee (₹), the sole currency of the Platform.
- **Slug**: A URL-safe, hyphenated string uniquely identifying a Product (e.g., `premium-tee-navy`).
- **UPI**: Unified Payments Interface, the Indian digital payment standard used for QR payments.
- **Firestore_Security_Rules**: The Firebase Firestore rules file controlling read/write access per collection.
- **Zod**: The TypeScript-first schema validation library used for all form and API input validation.
- **FilterSidebar**: The component on collection pages providing category, price, rating, availability, and sort controls.
- **CollectionPage**: The shared component rendering paginated, filtered product grids for `/men` and `/women`.
- **ProductDetailClient**: The client component rendering the full product detail page including gallery, variants, and reviews.
- **CheckoutClient**: The client component managing the 3-step checkout flow.
- **AccountClient**: The client component rendering the authenticated user's profile, orders, wishlist, and addresses.
- **SearchOverlay**: The full-screen search UI with debounced live results, history, and trending terms.
- **NewsletterForm**: The email subscription form component present in the footer and homepage.
- **WishlistClient**: The client component rendering the Customer's saved wishlist items.
- **VisionClient**: The client component rendering the brand's six promise pillars.
- **AboutClient**: The client component rendering the brand timeline and team story.

---

## Requirements

### Requirement 1: Landing Page — Cinematic Hero Section

**User Story:** As a Customer, I want to experience a visually compelling homepage hero, so that I immediately understand Wefton Copper's premium brand identity and am motivated to explore products.

#### Acceptance Criteria

1. THE HeroSection SHALL render a full-viewport canvas animation driven by scroll position that transitions through at least 5 product images in sequence.
2. WHEN the page loads, THE HeroSection SHALL display the brand tagline "Premium Lightweight Micro-French Terry" and a primary call-to-action button linking to `/men` or `/women`.
3. WHILE the Customer scrolls through the hero section, THE HeroSection SHALL advance the canvas animation frame in proportion to the scroll offset, producing a smooth cinematic effect at 60 fps on devices with a GPU.
4. WHEN the Customer's device reports `prefers-reduced-motion: reduce`, THE HeroSection SHALL display a static hero image instead of the scroll-driven animation.
5. THE HeroSection SHALL load hero images using Next.js `<Image>` with `priority` set to `true`, WebP format, and explicit `width` and `height` attributes to prevent layout shift.
6. IF the canvas context cannot be initialised (e.g., unsupported browser), THEN THE HeroSection SHALL fall back to a CSS-animated static image without throwing a JavaScript error.

---

### Requirement 2: Landing Page — Category Showcase

**User Story:** As a Customer, I want to see a visual grid of product categories on the homepage, so that I can quickly navigate to the collection I am interested in.

#### Acceptance Criteria

1. THE CategoryShowcase SHALL display at least 6 category tiles, each containing a category image, category name, and a link to the corresponding filtered collection page.
2. WHEN a Customer clicks a category tile, THE Platform SHALL navigate to `/men` or `/women` with the selected category pre-applied as a filter query parameter.
3. THE CategoryShowcase SHALL source category images from Firebase Storage URLs stored in Firestore category documents.
4. WHEN category images fail to load, THE CategoryShowcase SHALL display a branded placeholder with the category name visible.
5. THE CategoryShowcase SHALL be fully responsive, displaying 2 columns on mobile (< 768 px), 3 columns on tablet (768–1023 px), and 4 columns on desktop (≥ 1024 px).

---

### Requirement 3: Landing Page — Featured Products Section

**User Story:** As a Customer, I want to see curated featured products on the homepage, so that I can discover Wefton Copper's best offerings without navigating to a collection page.

#### Acceptance Criteria

1. THE FeaturedProducts component SHALL fetch up to 8 products from Firestore where `featured == true`, ordered by `createdAt` descending.
2. WHEN no featured products exist in Firestore, THE FeaturedProducts component SHALL display a "Coming Soon" placeholder section rather than an empty or broken layout.
3. THE FeaturedProducts component SHALL render each product using the ProductCard component, displaying the product image, title, price in INR, rating stars, and an "Add to Cart" affordance.
4. WHEN a Customer clicks "Add to Cart" on a ProductCard, THE CartStore SHALL add the product with its default variant (first available size) and open the CartDrawer.
5. THE FeaturedProducts component SHALL animate product cards into view using Framer Motion when they enter the viewport.

---

### Requirement 4: Landing Page — Brand Story Section

**User Story:** As a Customer, I want to read about Wefton Copper's brand values and product differentiators, so that I can trust the brand's quality and sustainability commitments.

#### Acceptance Criteria

1. THE BrandStory component SHALL display all five product differentiators: authenticity serial number, plastic-free packaging, seed bag inclusion, fabric freshener, and finger brush.
2. THE BrandStory component SHALL display an icon or illustration alongside each differentiator with a short descriptive text of no more than 40 words per item.
3. THE BrandStory component SHALL include a section explaining the copper-stitched craftsmanship unique to Wefton Copper garments.
4. WHEN the BrandStory section enters the viewport, THE Platform SHALL trigger Framer Motion entrance animations for each differentiator card with a staggered delay of 100 ms per card.

---

### Requirement 5: Landing Page — Testimonials Section

**User Story:** As a Customer, I want to read verified customer testimonials on the homepage, so that I can feel confident about the product quality before purchasing.

#### Acceptance Criteria

1. THE TestimonialsSection SHALL display at least 3 customer testimonials, each containing a customer name, star rating (1–5), review text, and an optional verified purchase badge.
2. THE TestimonialsSection SHALL source testimonials from Firestore (the `reviews` collection, filtered to `verified == true`) or from a static curated array if no Firestore reviews exist.
3. WHEN more than 3 testimonials are available, THE TestimonialsSection SHALL render them in an auto-advancing carousel with a 5-second interval and manual navigation dots.
4. WHEN the carousel is focused or hovered, THE TestimonialsSection SHALL pause auto-advancement to prevent accessibility issues.

---

### Requirement 6: Landing Page — Newsletter Subscription

**User Story:** As a Customer, I want to subscribe to the Wefton Copper newsletter, so that I receive updates about new arrivals and exclusive offers.

#### Acceptance Criteria

1. THE NewsletterForm SHALL render an email input field and a "Subscribe" button.
2. WHEN a Customer submits a valid email address, THE NewsletterForm SHALL write a document to the Firestore `newsletter_subscribers` collection containing the email and a server timestamp, then display a success confirmation message.
3. IF the submitted email address fails Zod email validation, THEN THE NewsletterForm SHALL display an inline error message "Please enter a valid email address" without submitting to Firestore.
4. IF the submitted email already exists in the `newsletter_subscribers` collection, THEN THE NewsletterForm SHALL display the message "You are already subscribed" without creating a duplicate document.
5. THE NewsletterForm SHALL disable the submit button and show a loading spinner while the Firestore write is in progress.

---

### Requirement 7: Product Catalog — Collection Pages

**User Story:** As a Customer, I want to browse the full men's or women's collection with filtering and sorting, so that I can find products that match my preferences efficiently.

#### Acceptance Criteria

1. THE CollectionPage SHALL fetch products from Firestore using `getProductsByGender`, passing the active `FilterState` and a pagination cursor.
2. THE CollectionPage SHALL support filtering by: category (multi-select from the gender's category list), price range (min/max slider in INR), minimum rating (1–5 stars), availability (in-stock only toggle), new arrivals toggle, and bestsellers toggle.
3. THE CollectionPage SHALL support sorting by: newest (default), price ascending, price descending, rating, and bestseller.
4. WHEN a Customer changes any filter or sort option, THE CollectionPage SHALL reset the pagination cursor and reload results from Firestore within 500 ms.
5. THE CollectionPage SHALL implement infinite scroll pagination, loading the next 12 products when the Customer scrolls within 200 px of the bottom of the product grid.
6. THE CollectionPage SHALL support toggling between a grid view (3 columns desktop, 2 columns tablet, 1 column mobile) and a list view (single column with horizontal product card layout).
7. WHEN no products match the active filters, THE CollectionPage SHALL display a "No products found" message with a "Clear Filters" button that resets all filters to their defaults.
8. THE FilterSidebar SHALL be visible as a persistent sidebar on desktop (≥ 1024 px) and accessible via a slide-over drawer triggered by a "Filter" button on mobile (< 1024 px).
9. THE CollectionPage SHALL display the active filter count as a badge on the "Filter" button when one or more non-default filters are applied.
10. WHEN a Customer navigates back from a product detail page, THE CollectionPage SHALL restore the previous scroll position and filter state using URL query parameters.

---

### Requirement 8: Product Catalog — Product Card

**User Story:** As a Customer, I want each product card to show key information at a glance, so that I can make quick decisions without opening every product detail page.

#### Acceptance Criteria

1. THE ProductCard SHALL display: primary product image, product title, price in INR (₹), compare price with strikethrough if `comparePrice` is set, average rating as filled stars, review count, and availability status.
2. WHEN `comparePrice` is set and greater than `price`, THE ProductCard SHALL calculate and display the discount percentage as a badge (e.g., "20% OFF").
3. WHEN a product has `newArrival == true`, THE ProductCard SHALL display a "New" badge.
4. WHEN a product has `bestseller == true`, THE ProductCard SHALL display a "Bestseller" badge.
5. WHEN a product has `inventory == 0`, THE ProductCard SHALL display an "Out of Stock" overlay and disable the "Add to Cart" affordance.
6. WHEN a Customer hovers over a ProductCard on desktop, THE ProductCard SHALL reveal a secondary product image (if available) via a smooth CSS transition.
7. WHEN a Customer clicks the wishlist icon on a ProductCard, THE WishlistStore SHALL toggle the product in the wishlist and update the icon state immediately (optimistic update).

---

### Requirement 9: Product Detail — Page Structure and Data

**User Story:** As a Customer, I want a comprehensive product detail page, so that I have all the information I need to make a confident purchase decision.

#### Acceptance Criteria

1. THE Platform SHALL generate static paths for all products at build time using `generateStaticParams` with `getProductBySlug`, and revalidate every 3600 seconds using ISR.
2. THE ProductDetailClient SHALL fetch the full `Product` document from Firestore by slug and render all fields: title, description, price, compare price, images, variants, ratings, and review count.
3. WHEN a product slug does not match any Firestore document, THE Platform SHALL render the `/not-found` page with a 404 HTTP status.
4. THE ProductDetailClient SHALL render structured data (JSON-LD `Product` schema) in the page `<head>` containing name, image, description, price, currency, availability, and aggregate rating.

---

### Requirement 10: Product Detail — Image Gallery

**User Story:** As a Customer, I want to view multiple product images with zoom capability, so that I can inspect fabric texture and fit details before buying.

#### Acceptance Criteria

1. THE ProductDetailClient SHALL render a primary image display area and a row of thumbnail images for all images in `Product.images`.
2. WHEN a Customer clicks a thumbnail, THE ProductDetailClient SHALL update the primary image to the selected image with a smooth crossfade transition.
3. WHEN a Customer hovers over the primary image on desktop, THE ProductDetailClient SHALL activate a CSS or JavaScript zoom effect showing a magnified view of the hovered area.
4. WHEN a Customer swipes left or right on the primary image on a touch device, THE ProductDetailClient SHALL navigate to the next or previous image respectively.
5. THE ProductDetailClient SHALL display image alt text from `ProductImage.alt` for all images to meet WCAG 2.1 AA accessibility requirements.

---

### Requirement 11: Product Detail — Variant Selection

**User Story:** As a Customer, I want to select a size and colour variant before adding to cart, so that I receive the exact product I intend to purchase.

#### Acceptance Criteria

1. THE ProductDetailClient SHALL render size selector buttons for all sizes defined in `SIZES` (`XS`, `S`, `M`, `L`, `XL`, `XXL`, `3XL`) that have a corresponding `ProductVariant` with `inventory > 0`.
2. WHEN a size has `inventory == 0` across all colour variants, THE ProductDetailClient SHALL render that size button as disabled with a strikethrough style.
3. WHEN colour variants exist, THE ProductDetailClient SHALL render colour swatches using `ProductVariant.colorHex` values; clicking a swatch SHALL update the selected colour and refresh the displayed inventory count.
4. WHEN a Customer selects a size and colour combination, THE ProductDetailClient SHALL display the remaining inventory count if it is 5 or fewer units (e.g., "Only 3 left").
5. WHEN a Customer attempts to add to cart without selecting a required size, THE ProductDetailClient SHALL display an inline validation message "Please select a size" and scroll to the size selector.

---

### Requirement 12: Product Detail — Add to Cart and Wishlist

**User Story:** As a Customer, I want to add products to my cart or wishlist from the product detail page, so that I can manage my intended purchases.

#### Acceptance Criteria

1. WHEN a Customer clicks "Add to Cart" with a valid variant selected, THE CartStore SHALL add the item and THE CartDrawer SHALL open automatically.
2. WHEN the selected variant's inventory is already fully in the cart, THE ProductDetailClient SHALL display "Maximum quantity reached" and disable the "Add to Cart" button.
3. WHEN a Customer clicks the wishlist icon, THE WishlistStore SHALL toggle the product and persist the change to Firestore under `users/{uid}/wishlist` if the Customer is authenticated.
4. IF the Customer is not authenticated and clicks the wishlist icon, THEN THE AuthModal SHALL open prompting sign-in, and the wishlist action SHALL be retried automatically after successful authentication.
5. THE ProductDetailClient SHALL render a "Share" button that copies the canonical product URL to the clipboard and displays a "Link copied" toast notification.

---

### Requirement 13: Product Detail — Delivery Information

**User Story:** As a Customer, I want to see delivery timelines and shipping cost information on the product page, so that I can set accurate expectations before checkout.

#### Acceptance Criteria

1. THE ProductDetailClient SHALL display the standard shipping cost of ₹99 and the free shipping threshold of ₹999.
2. THE ProductDetailClient SHALL display an estimated delivery window of 5–7 business days for standard delivery.
3. WHEN the Customer's cart subtotal (including the current product) would meet or exceed ₹999, THE ProductDetailClient SHALL display "Add this item for free shipping" or "You qualify for free shipping" accordingly.

---

### Requirement 14: Product Detail — Similar Products

**User Story:** As a Customer, I want to see similar products at the bottom of a product detail page, so that I can discover alternatives or complementary items.

#### Acceptance Criteria

1. THE ProductDetailClient SHALL fetch up to 4 products from the same `category` as the current product, excluding the current product, using `getSimilarProducts`.
2. THE ProductDetailClient SHALL render similar products as a horizontal scrollable row of ProductCard components.
3. WHEN fewer than 2 similar products exist, THE ProductDetailClient SHALL hide the similar products section entirely.

---

### Requirement 15: Product Detail — Customer Reviews

**User Story:** As a Customer, I want to read and write product reviews, so that I can make informed decisions and share my experience with other shoppers.

#### Acceptance Criteria

1. THE ProductDetailClient SHALL fetch all reviews for the product from Firestore using `getProductReviews` and display them sorted by `createdAt` descending.
2. THE ProductDetailClient SHALL display an aggregate rating summary showing the average rating, total review count, and a star distribution bar chart (5-star to 1-star breakdown).
3. WHEN an authenticated Customer who has purchased the product submits a review, THE Platform SHALL call `addReview` with `verified: true` and update the product's `ratings` and `reviewsCount` fields in Firestore atomically.
4. WHEN an authenticated Customer who has not purchased the product submits a review, THE Platform SHALL call `addReview` with `verified: false`.
5. IF a Customer attempts to submit a review without being authenticated, THEN THE AuthModal SHALL open and the review form SHALL be preserved until after sign-in.
6. THE review submission form SHALL validate: rating (required, 1–5 integer), comment (required, 10–500 characters) using Zod before calling `addReview`.
7. WHEN a Customer clicks "Helpful" on a review, THE Platform SHALL call `markHelpful` and increment the `helpful` counter, displaying the updated count immediately (optimistic update).
8. THE ProductDetailClient SHALL display each review with: reviewer name, avatar (or initials fallback), star rating, comment, verified badge (if `verified == true`), helpful count, and relative timestamp.
9. WHEN more than 5 reviews exist, THE ProductDetailClient SHALL show the first 5 and provide a "Load more reviews" button that fetches the next page from Firestore.

---

### Requirement 16: Authentication — Sign-In Methods

**User Story:** As a Customer, I want multiple sign-in options, so that I can authenticate using my preferred method without friction.

#### Acceptance Criteria

1. THE AuthModal SHALL provide four authentication methods: Google OAuth, Facebook OAuth, Phone OTP, and Email/Password.
2. WHEN a Customer clicks "Continue with Google", THE AuthModal SHALL call `signInWithGoogle`, which invokes `signInWithPopup` with `GoogleAuthProvider`, and on success SHALL close the modal and update `authStore` with the returned `User`.
3. WHEN a Customer clicks "Continue with Facebook", THE AuthModal SHALL call `signInWithFacebook`, which invokes `signInWithPopup` with `FacebookAuthProvider`, and on success SHALL close the modal and update `authStore`.
4. WHEN a Customer submits a valid Indian phone number (+91 format), THE AuthModal SHALL call `sendOTP` using Firebase `signInWithPhoneNumber` with an invisible reCAPTCHA verifier, then transition to an OTP entry screen.
5. WHEN a Customer submits a 6-digit OTP, THE AuthModal SHALL call `verifyOTP` and on success SHALL close the modal and update `authStore`.
6. IF the OTP is incorrect or expired, THEN THE AuthModal SHALL display the error message "Invalid or expired OTP. Please try again." and allow re-entry.
7. WHEN a new user authenticates via any method, THE Platform SHALL call `upsertUserDoc` to create a Firestore `users/{uid}` document with `role: "user"` if one does not already exist.
8. THE AuthModal SHALL validate email format and password minimum length of 8 characters using Zod before calling Firebase Auth methods.

---

### Requirement 17: Authentication — Session Persistence and Protected Routes

**User Story:** As a Customer, I want my session to persist across browser refreshes, so that I do not have to sign in repeatedly.

#### Acceptance Criteria

1. THE Platform SHALL initialise Firebase Auth with `browserLocalPersistence` so that the Customer's session survives browser restarts.
2. WHEN the Platform loads, THE authStore SHALL subscribe to `onAuthStateChanged` and populate the store with the current `User` document from Firestore if a session exists.
3. WHILE a Customer is not authenticated, THE Platform SHALL redirect any navigation to `/account`, `/checkout`, or `/wishlist` to the homepage with the AuthModal open.
4. WHEN an Admin navigates to `/admin` without `role: "admin"` in their Firestore user document, THE Platform SHALL redirect to the homepage with a 403 status.
5. THE Platform SHALL expose a `useAuth` hook that returns `{ user, loading, isAdmin }` for use in all protected components.

---

### Requirement 18: Authentication — Password Reset

**User Story:** As a Customer, I want to reset my password via email, so that I can regain access to my account if I forget my credentials.

#### Acceptance Criteria

1. THE AuthModal SHALL include a "Forgot password?" link on the Email/Password sign-in screen.
2. WHEN a Customer clicks "Forgot password?" and submits a valid email, THE Platform SHALL call `resetPassword` (Firebase `sendPasswordResetEmail`) and display the message "Password reset email sent. Check your inbox."
3. IF the submitted email is not registered in Firebase Auth, THEN THE Platform SHALL display the message "No account found with this email address."
4. THE password reset email input SHALL be validated with Zod email schema before calling Firebase Auth.

---

### Requirement 19: Cart — Cart Drawer

**User Story:** As a Customer, I want a slide-over cart drawer, so that I can review and modify my cart without leaving the current page.

#### Acceptance Criteria

1. THE CartDrawer SHALL open from the right side of the viewport when `cartStore.isOpen` is `true`, with a Framer Motion slide-in animation of 300 ms duration.
2. THE CartDrawer SHALL display each cart item with: product image, title, selected size, selected colour, unit price in INR, quantity stepper (decrement / increment), and a remove button.
3. WHEN a Customer increments a cart item quantity beyond the item's `inventory`, THE CartStore SHALL cap the quantity at `inventory` and THE CartDrawer SHALL display "Max quantity reached".
4. THE CartDrawer SHALL display a free shipping progress bar showing how much more the Customer needs to spend to reach the ₹999 free shipping threshold.
5. WHEN the cart subtotal meets or exceeds ₹999, THE CartDrawer SHALL replace the progress bar with a "Free shipping unlocked!" message.
6. THE CartDrawer SHALL display the order summary: subtotal, discount (if coupon applied), shipping cost, GST (5%), and total, all in INR.
7. THE CartDrawer SHALL include a coupon code input field and an "Apply" button.
8. WHEN a Customer applies a valid coupon code, THE CartStore SHALL call `applyCoupon`, which SHALL validate the code against the Firestore `coupons` collection and apply the discount percentage; the CartDrawer SHALL update all totals immediately.
9. IF a coupon code is invalid or expired, THEN THE CartDrawer SHALL display "Invalid or expired coupon code" inline.
10. THE CartDrawer SHALL include a "Proceed to Checkout" button that navigates to `/checkout` and closes the drawer; IF the Customer is not authenticated, THEN THE AuthModal SHALL open first.

---

### Requirement 20: Cart — Coupon Management via Firestore

**User Story:** As an Admin, I want to manage coupon codes in Firestore, so that I can run promotions without deploying code changes.

#### Acceptance Criteria

1. THE Platform SHALL read coupon validity from a Firestore `coupons` collection document with fields: `code` (string, uppercase), `discount` (integer percentage 1–100), `active` (boolean), and `expiresAt` (Firestore Timestamp or null).
2. WHEN `applyCoupon` is called, THE CartStore SHALL query Firestore for a `coupons` document where `code == input.toUpperCase()` and `active == true`.
3. IF the coupon document has an `expiresAt` value that is in the past, THEN THE CartStore SHALL treat the coupon as invalid and return a "Coupon has expired" error.
4. THE CartStore SHALL replace the current hardcoded coupon map with the Firestore-backed lookup described in criteria 1–3.

---

### Requirement 21: Checkout — Three-Step Flow

**User Story:** As a Customer, I want a clear multi-step checkout process, so that I can complete my purchase with confidence and without confusion.

#### Acceptance Criteria

1. THE CheckoutClient SHALL implement a 3-step wizard: Step 1 (Delivery Address), Step 2 (Payment — QR), Step 3 (Order Confirmation).
2. THE CheckoutClient SHALL display a step indicator at the top showing the current step and completed steps.
3. WHEN a Customer completes Step 1 and clicks "Continue to Payment", THE CheckoutClient SHALL validate the address form using Zod (name, phone, line1, city, state, pincode required) before advancing to Step 2.
4. WHEN a Customer navigates back from Step 2 to Step 1, THE CheckoutClient SHALL preserve the entered address data.
5. THE CheckoutClient SHALL be accessible only to authenticated Customers; unauthenticated access SHALL redirect to the homepage with the AuthModal open.
6. WHEN the Customer reaches Step 3 (Order Confirmation), THE CartStore SHALL call `clearCart` and THE CheckoutClient SHALL display the order ID, itemised summary, total paid, and estimated delivery window.

---

### Requirement 22: Checkout — Delivery Address Step

**User Story:** As a Customer, I want to enter or select a delivery address during checkout, so that my order is shipped to the correct location.

#### Acceptance Criteria

1. THE CheckoutClient Step 1 SHALL display a form with fields: Full Name, Phone Number, Address Line 1, Address Line 2 (optional), City, State, PIN Code, and Country (default: India).
2. WHEN the authenticated Customer has saved addresses in their Firestore `users/{uid}` document, THE CheckoutClient SHALL display them as selectable address cards above the new address form.
3. WHEN a Customer selects a saved address, THE CheckoutClient SHALL pre-fill the form fields with that address's data.
4. WHEN a Customer submits a new address and checks "Save this address", THE Platform SHALL append the address to the `users/{uid}.addresses` array in Firestore with a generated `addressId`.
5. THE PIN Code field SHALL be validated as a 6-digit numeric string using Zod.
6. THE Phone Number field SHALL be validated as a 10-digit Indian mobile number using Zod.

---

### Requirement 23: Checkout — QR Payment Step

**User Story:** As a Customer, I want to pay via UPI QR code, so that I can complete my purchase using India's most widely adopted payment method.

#### Acceptance Criteria

1. WHEN the Customer reaches Step 2, THE CheckoutClient SHALL call `createOrder` to create a Firestore `orders` document with `paymentStatus: "pending"` and `orderStatus: "placed"`, then display the generated `orderId`.
2. THE CheckoutClient Step 2 SHALL display a UPI QR code image loaded from a configurable environment variable `NEXT_PUBLIC_UPI_QR_IMAGE_URL`, alongside the UPI ID from `NEXT_PUBLIC_UPI_ID`.
3. THE CheckoutClient Step 2 SHALL display the exact amount to pay in INR, the order ID as the payment reference, and instructions to include the order ID in the UPI payment note.
4. THE CheckoutClient Step 2 SHALL provide a file upload input accepting JPEG, PNG, and WebP images up to 5 MB for the payment screenshot.
5. WHEN a Customer uploads a screenshot and enters a UPI transaction reference number, THE CheckoutClient SHALL call `uploadPaymentScreenshot`, which uploads the file to Firebase Storage at `payments/{orderId}/{filename}` and updates the order's `paymentStatus` to `"uploaded"` and `paymentScreenshot` to the download URL.
6. IF the uploaded file exceeds 5 MB or is not an accepted image format, THEN THE CheckoutClient SHALL display "Please upload a JPEG, PNG, or WebP image under 5 MB" and reject the upload.
7. WHEN `uploadPaymentScreenshot` completes successfully, THE CheckoutClient SHALL advance to Step 3 (Order Confirmation).
8. THE UPI QR image SHALL be served from Firebase Storage or a CDN; the URL SHALL be configurable via `NEXT_PUBLIC_UPI_QR_IMAGE_URL` without requiring a code deployment.

---

### Requirement 24: Order Management — Admin Payment Verification

**User Story:** As an Admin, I want to review uploaded payment screenshots and approve or reject orders, so that I can confirm genuine payments before processing shipments.

#### Acceptance Criteria

1. THE AdminDashboard SHALL display a "Pending Payments" tab listing all orders where `paymentStatus == "uploaded"`, sorted by `createdAt` ascending (oldest first).
2. WHEN an Admin clicks an order in the pending payments list, THE AdminDashboard SHALL display: order ID, customer name, total amount, order items, shipping address, payment screenshot (rendered as a clickable image), and UPI transaction reference.
3. WHEN an Admin clicks "Approve Payment", THE Platform SHALL call `updateOrderStatus` setting `paymentStatus: "verified"` and `orderStatus: "confirmed"`, and remove the order from the pending payments list.
4. WHEN an Admin clicks "Reject Payment", THE Platform SHALL call `updateOrderStatus` setting `paymentStatus: "failed"` and `orderStatus: "cancelled"`, and remove the order from the pending payments list.
5. THE AdminDashboard SHALL require `role: "admin"` verified server-side via Firestore; any non-admin request SHALL be rejected with a redirect to the homepage.

---

### Requirement 25: Order Management — Order Status Updates

**User Story:** As an Admin, I want to update order fulfilment status, so that customers receive accurate tracking information.

#### Acceptance Criteria

1. THE AdminDashboard SHALL display an "All Orders" tab listing all orders with columns: order ID, customer name, date, total, payment status, and order status.
2. WHEN an Admin selects an order, THE AdminDashboard SHALL provide a dropdown to update `orderStatus` to any of: `placed`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`.
3. WHEN an Admin sets `orderStatus` to `"shipped"`, THE AdminDashboard SHALL display an optional input for a tracking number, which SHALL be saved to `Order.trackingNumber` in Firestore.
4. WHEN `updateOrderStatus` is called, THE Platform SHALL write `updatedAt: serverTimestamp()` alongside the status change.
5. THE AdminDashboard SHALL display real-time order updates using Firestore `onSnapshot` listeners so that new orders appear without a page refresh.

---

### Requirement 26: Order Management — Revenue Statistics

**User Story:** As an Admin, I want to see key business metrics on the dashboard, so that I can monitor platform performance at a glance.

#### Acceptance Criteria

1. THE AdminDashboard SHALL display an `AdminStats` summary panel containing: total orders, total revenue (sum of `Order.total` for `paymentStatus == "verified"` orders), total products, total users, pending orders count, and pending payments count.
2. THE AdminDashboard SHALL calculate stats by querying Firestore at page load and refresh them when the Admin manually clicks a "Refresh" button.
3. THE AdminDashboard SHALL display revenue in INR formatted with the `en-IN` locale (e.g., ₹1,23,456).

---

### Requirement 27: Admin — Product Management

**User Story:** As an Admin, I want to add, edit, and delete products from the dashboard, so that I can keep the product catalogue up to date without developer intervention.

#### Acceptance Criteria

1. THE AdminDashboard SHALL include a "Products" tab listing all products with columns: primary image thumbnail, title, category, gender, price, inventory, and status (featured/bestseller/new arrival badges).
2. WHEN an Admin clicks "Add Product", THE AdminDashboard SHALL open a product form modal with fields for all `Product` type properties: title, slug (auto-generated from title, editable), description, short description, category (dropdown from `MEN_CATEGORIES` or `WOMEN_CATEGORIES`), gender, tags, price, compare price, inventory, SKU, featured toggle, bestseller toggle, new arrival toggle.
3. WHEN an Admin uploads product images in the product form, THE Platform SHALL upload each image to Firebase Storage at `products/{productId}/{filename}`, obtain the download URL, and populate `Product.images` with `{ url, alt, isPrimary }` objects.
4. WHEN an Admin submits the product form, THE Platform SHALL validate all required fields using Zod before calling `createProduct` or `updateProduct`.
5. WHEN an Admin clicks "Edit" on a product, THE AdminDashboard SHALL open the product form pre-filled with the existing product data.
6. WHEN an Admin clicks "Delete" on a product, THE AdminDashboard SHALL display a confirmation dialog; upon confirmation, THE Platform SHALL call `deleteProduct` and remove the product from the list.
7. THE product form SHALL support adding multiple `ProductVariant` entries, each with size, colour, colour hex, price override (optional), inventory, and SKU.
8. IF a product slug already exists in Firestore when creating a new product, THEN THE Platform SHALL display "This slug is already in use. Please choose a different slug." and prevent submission.

---

### Requirement 28: User Account — Profile Management

**User Story:** As a Customer, I want to view and update my profile information, so that my account details remain accurate.

#### Acceptance Criteria

1. THE AccountClient SHALL display the Customer's name, email, phone number, and avatar on the profile tab.
2. WHEN a Customer updates their display name and clicks "Save", THE Platform SHALL call Firebase Auth `updateProfile` and update the `name` field in the Firestore `users/{uid}` document.
3. WHEN a Customer uploads a new avatar image, THE Platform SHALL upload it to Firebase Storage at `avatars/{uid}/{filename}`, obtain the download URL, call Firebase Auth `updateProfile` with `photoURL`, and update `users/{uid}.avatar` in Firestore.
4. THE AccountClient SHALL be accessible only to authenticated Customers; unauthenticated access SHALL redirect to the homepage with the AuthModal open.

---

### Requirement 29: User Account — Order History

**User Story:** As a Customer, I want to view my order history with current status, so that I can track my purchases and know when to expect delivery.

#### Acceptance Criteria

1. THE AccountClient SHALL fetch the Customer's orders from Firestore using `getUserOrders(uid)` and display them in a list sorted by `createdAt` descending.
2. THE AccountClient SHALL display each order with: order ID, date, itemised product list (image, title, size, colour, quantity, price), subtotal, shipping, GST, total, payment status badge, and order status badge.
3. WHEN `orderStatus == "shipped"` and `trackingNumber` is set, THE AccountClient SHALL display the tracking number with a copy-to-clipboard button.
4. THE AccountClient SHALL use colour-coded status badges: `placed` (grey), `confirmed` (blue), `processing` (yellow), `shipped` (purple), `delivered` (green), `cancelled` (red).
5. WHEN a Customer has no orders, THE AccountClient SHALL display "No orders yet" with a link to the homepage.

---

### Requirement 30: User Account — Saved Addresses

**User Story:** As a Customer, I want to manage my saved delivery addresses, so that I can check out faster on repeat purchases.

#### Acceptance Criteria

1. THE AccountClient SHALL display all addresses stored in `users/{uid}.addresses` as address cards.
2. WHEN a Customer clicks "Add Address", THE AccountClient SHALL display an address form identical to the checkout address form, validated with the same Zod schema.
3. WHEN a Customer saves a new address, THE Platform SHALL append it to `users/{uid}.addresses` in Firestore with a UUID `addressId`.
4. WHEN a Customer clicks "Set as Default" on an address, THE Platform SHALL set `isDefault: true` on that address and `isDefault: false` on all others in the array.
5. WHEN a Customer clicks "Delete" on an address, THE Platform SHALL remove that address from the `users/{uid}.addresses` array in Firestore.

---

### Requirement 31: Wishlist

**User Story:** As a Customer, I want to save products to a wishlist, so that I can return to them later without searching again.

#### Acceptance Criteria

1. THE WishlistClient SHALL fetch the Customer's wishlist product IDs from `wishlistStore` (persisted to localStorage) and resolve full `Product` documents from Firestore.
2. WHEN an authenticated Customer adds a product to the wishlist, THE Platform SHALL also write the `productId` to `users/{uid}.wishlist` array in Firestore for cross-device persistence.
3. WHEN a Customer removes a product from the wishlist on the WishlistClient, THE WishlistStore SHALL remove the item and THE Platform SHALL remove the `productId` from `users/{uid}.wishlist` in Firestore.
4. THE WishlistClient SHALL render each wishlist item as a ProductCard with an "Add to Cart" button and a "Remove from Wishlist" button.
5. WHEN a wishlist product is out of stock, THE WishlistClient SHALL display an "Out of Stock" badge on the ProductCard and disable the "Add to Cart" button.
6. WHEN the wishlist is empty, THE WishlistClient SHALL display "Your wishlist is empty" with a link to the homepage.

---

### Requirement 32: Search

**User Story:** As a Customer, I want to search for products by name, category, or tag, so that I can find specific items quickly.

#### Acceptance Criteria

1. THE SearchOverlay SHALL open when a Customer clicks the search icon in the Navbar, covering the full viewport with a backdrop.
2. THE SearchOverlay SHALL debounce the search input by 300 ms before calling `searchProducts` to avoid excessive Firestore reads.
3. WHEN `searchProducts` returns results, THE SearchOverlay SHALL display up to 20 matching products as a list with product image, title, category, and price.
4. WHEN the search query is empty, THE SearchOverlay SHALL display the Customer's recent search history (up to 5 terms, stored in `searchStore`) and a list of trending search terms (stored in a Firestore `search_config` document).
5. WHEN a Customer selects a search result, THE Platform SHALL navigate to the product detail page and close the SearchOverlay.
6. WHEN a Customer submits a search query (presses Enter), THE Platform SHALL navigate to `/search?q={query}` and display paginated results using the CollectionPage layout.
7. WHEN no results are found, THE SearchOverlay SHALL display "No products found for '{query}'" and suggest browsing the men's or women's collection.
8. WHEN a Customer performs a search, THE searchStore SHALL prepend the query to the search history, capping the history at 5 entries and deduplicating.
9. THE SearchOverlay SHALL close when the Customer presses the Escape key or clicks outside the overlay.

---

### Requirement 33: Brand Pages — Vision

**User Story:** As a Customer, I want to read about Wefton Copper's brand vision and six promises, so that I can understand the values behind the products I am buying.

#### Acceptance Criteria

1. THE VisionClient SHALL render six brand promise sections, one for each: (1) Authenticity Serial Number, (2) Plastic-Free Packaging, (3) Organic Fabric Freshener, (4) Seed Bag, (5) Finger Brush, (6) Copper-Stitched Craftsmanship.
2. EACH brand promise section SHALL contain: a title, a descriptive paragraph of 50–150 words, and an illustrative icon or image.
3. THE VisionClient SHALL animate each section into view using Framer Motion with a staggered entrance as the Customer scrolls down the page.
4. THE VisionClient SHALL include a section explaining the authenticity serial number verification process, describing how Customers can verify their garment's authenticity using the serial number printed on the product tag.

---

### Requirement 34: Brand Pages — About

**User Story:** As a Customer, I want to learn about the Wefton Copper brand story and team, so that I can connect with the people behind the products.

#### Acceptance Criteria

1. THE AboutClient SHALL render a brand timeline with at least 3 milestones, each containing a year, a title, and a description.
2. THE AboutClient SHALL include a mission statement section and a section describing the brand's commitment to sustainable and ethical manufacturing.
3. THE AboutClient SHALL render the brand contact information: email (`sales@weftoncopper.com`), phone (`+91 80561 35201`), and social media links for Instagram, Facebook, and Twitter.

---

### Requirement 35: Performance — Core Web Vitals and Lighthouse

**User Story:** As a business stakeholder, I want the platform to meet performance benchmarks, so that customers experience fast load times and the site ranks well in search engines.

#### Acceptance Criteria

1. THE Platform SHALL achieve a Lighthouse Performance score of 90 or above on the homepage, a collection page, and a product detail page when measured in a production build.
2. THE Platform SHALL serve all product and category images in WebP or AVIF format using Next.js `<Image>` with automatic format negotiation.
3. THE Platform SHALL implement Incremental Static Regeneration (ISR) with a 3600-second revalidation interval for all product detail pages.
4. THE Platform SHALL implement static generation (`generateStaticParams`) for the `/men`, `/women`, `/new-arrivals`, and `/bestsellers` pages.
5. THE Platform SHALL lazy-load all below-the-fold images using `loading="lazy"` on Next.js `<Image>` components.
6. THE Platform SHALL use Next.js `dynamic()` with `{ ssr: false }` for heavy client-only components (CartDrawer, SearchOverlay, AuthModal) to reduce the initial server-rendered bundle size.

---

### Requirement 36: SEO — Metadata and Structured Data

**User Story:** As a business stakeholder, I want the platform to be discoverable by search engines, so that organic traffic drives product sales.

#### Acceptance Criteria

1. THE Platform SHALL export a `generateMetadata` function from every page route that returns a `Metadata` object with `title`, `description`, `openGraph` (title, description, images), and `twitter` card fields.
2. THE Platform SHALL serve a dynamically generated `sitemap.xml` from `/sitemap.xml` listing all product, collection, and brand page URLs with `lastmod` timestamps.
3. THE Platform SHALL serve a `robots.txt` from `/robots.txt` allowing all crawlers on public pages and disallowing `/admin` and `/account`.
4. THE Platform SHALL include JSON-LD structured data for `Product` schema on all product detail pages as described in Requirement 9, criterion 4.
5. THE Platform SHALL include JSON-LD `Organization` schema on the homepage with the brand name, URL, logo, and social profile links.
6. ALL page `<title>` tags SHALL follow the pattern `{Page Name} | Wefton Copper`.

---

### Requirement 37: Security — Firebase Security Rules

**User Story:** As a platform operator, I want Firestore and Storage access controlled by security rules, so that customers cannot read or modify other users' data.

#### Acceptance Criteria

1. THE Firestore_Security_Rules SHALL allow authenticated users to read and write only their own `users/{uid}` document.
2. THE Firestore_Security_Rules SHALL allow authenticated users to create documents in the `orders` collection only if `request.resource.data.userId == request.auth.uid`.
3. THE Firestore_Security_Rules SHALL allow authenticated users to read only their own orders (`resource.data.userId == request.auth.uid`).
4. THE Firestore_Security_Rules SHALL allow only Admin users (verified by `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin"`) to read all orders, update order status, and write to the `products` collection.
5. THE Firestore_Security_Rules SHALL allow all users (including unauthenticated) to read the `products`, `reviews`, and `coupons` collections.
6. THE Firestore_Security_Rules SHALL allow authenticated users to create documents in the `reviews` collection only if `request.resource.data.userId == request.auth.uid`.
7. Firebase Storage rules SHALL allow authenticated users to write to `payments/{orderId}/` only if the path's `orderId` matches an order owned by the authenticated user.
8. Firebase Storage rules SHALL allow authenticated users to write to `avatars/{uid}/` only if `uid == request.auth.uid`.
9. Firebase Storage rules SHALL allow only Admin users to write to `products/`.

---

### Requirement 38: Security — Input Validation and XSS/CSRF Protection

**User Story:** As a platform operator, I want all user inputs validated and sanitised, so that the platform is protected against injection and cross-site scripting attacks.

#### Acceptance Criteria

1. THE Platform SHALL validate all form inputs (authentication, checkout address, review submission, newsletter, product management) using Zod schemas before any Firestore write or Firebase Auth call.
2. THE Platform SHALL use Next.js built-in CSRF protection by ensuring all state-mutating operations are performed via Server Actions or API Routes with `SameSite=Strict` cookies.
3. THE Platform SHALL not render any user-supplied content as raw HTML; all review comments and user-provided text SHALL be rendered as plain text or escaped React children.
4. THE Platform SHALL implement rate limiting on the newsletter subscription endpoint to a maximum of 5 submissions per IP address per hour using a server-side counter.
5. THE Platform SHALL store no sensitive payment data (card numbers, CVV) in Firestore or client-side storage; only the UPI transaction reference string and screenshot URL SHALL be stored.

---

### Requirement 39: Infrastructure — Environment Configuration

**User Story:** As a developer, I want all sensitive configuration values managed via environment variables, so that secrets are never committed to the repository.

#### Acceptance Criteria

1. THE Platform SHALL read all Firebase configuration values (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) from `NEXT_PUBLIC_FIREBASE_*` environment variables.
2. THE Platform SHALL read the UPI QR image URL from `NEXT_PUBLIC_UPI_QR_IMAGE_URL` and the UPI ID from `NEXT_PUBLIC_UPI_ID`.
3. THE Platform SHALL provide a `.env.local.example` file listing all required environment variable keys with placeholder values and comments.
4. THE Platform SHALL initialise Firebase lazily (only when first accessed) to ensure SSR compatibility, as implemented in `src/lib/firebase.ts`.
5. IF any required Firebase environment variable is missing at runtime, THEN THE Platform SHALL log a descriptive error to the server console and return a graceful error response rather than throwing an unhandled exception.

---

### Requirement 40: Infrastructure — CI/CD and Deployment

**User Story:** As a developer, I want automated testing and deployment pipelines, so that code changes are validated before reaching production.

#### Acceptance Criteria

1. THE Platform SHALL include a GitHub Actions workflow that runs on every pull request to `main`, executing TypeScript type checking (`tsc --noEmit`) and ESLint.
2. THE Platform SHALL include a GitHub Actions workflow that deploys to the production hosting environment on every push to `main` after all checks pass.
3. THE Platform SHALL produce zero TypeScript type errors and zero ESLint errors in the production build.
4. THE Platform SHALL generate a production build (`next build`) without errors before any deployment.
