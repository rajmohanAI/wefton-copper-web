# Requirements Document

## Introduction

Wefton Copper V2 Overhaul defines the complete UI/UX redesign, e-commerce module additions, and performance improvements for the Wefton Copper e-commerce platform. The overhaul transitions from a canvas-driven hero with Framer Motion animations to a subtle premium static layout with a banner slider, rem-based typography, skeleton loaders, and a dark/light theme switcher. New e-commerce modules include inventory auto-decrement, order email notifications via Resend, a return/refund workflow, legal pages, admin coupon CRUD, and GA4 integration. The tech stack evolves to Next.js 16, TypeScript, Tailwind CSS 4, Firebase, Zustand, Swiper (banner slider), and next-themes.

---

## Glossary

- **Platform**: The Wefton Copper Next.js 16 web application after the V2 overhaul.
- **Customer**: An authenticated or guest end-user browsing or purchasing products.
- **Admin**: An authenticated user with `role: "admin"` in Firestore who manages orders, products, coupons, and return requests.
- **Banner_Slider**: The Swiper-powered hero component displaying static promotional banners on the homepage.
- **Product_Grid**: The CSS Grid layout component rendering product cards on collection and homepage sections without JavaScript-driven animations.
- **Skeleton_Loader**: A placeholder UI element rendered during data fetching, matching the dimensions of the content it replaces.
- **Theme_Switcher**: The next-themes powered component allowing Customers to toggle between dark and light colour modes.
- **Inventory_Service**: The Firestore transaction logic that decrements product variant stock on order placement.
- **Order_Email_Service**: The Next.js API route that sends transactional emails via the Resend API on order status changes.
- **Return_Request**: A Firestore document in the `returns` collection representing a Customer's request to return or refund a purchased item.
- **Coupon**: A Firestore document in the `coupons` collection defining a discount code, percentage, and validity period.
- **Legal_Page**: A statically rendered page containing Terms of Service, Privacy Policy, or Refund Policy content.
- **GA4**: Google Analytics 4 event tracking integrated via the `gtag.js` script.
- **Breakpoint_Mobile**: Viewport width of 375px, the minimum supported mobile layout width.
- **Breakpoint_Tablet**: Viewport width of 768px, the tablet layout threshold.
- **Breakpoint_Desktop**: Viewport width of 1024px and above, the desktop layout threshold.
- **Rem_Typography**: Font sizing system using rem units relative to a root font-size of 16px, replacing all viewport-width (vw) based font declarations.
- **Premium_Section**: A content section following the subtle premium design direction: light display typography, generous whitespace, a quiet warm-neutral palette and square-cornered cards. Built from the Container and Section layout primitives.
- **Container**: The layout primitive that alone sets content max-width and horizontal gutters.
- **Section**: The layout primitive that alone sets vertical section rhythm.
- **Placeholder_Image_Area**: A styled container with descriptive text indicating where product/banner imagery will be placed, used during development and content population phases.
- **Resend_API**: The email delivery service used for transactional order notifications via a Next.js API route.
- **Swiper**: The touch-enabled slider library used for the homepage banner carousel.
- **Next_Themes**: The theme management library providing dark/light mode with system preference detection.
- **INR**: Indian Rupee (₹), the sole currency of the Platform.
- **Firestore**: The Firebase Cloud Firestore database storing products, orders, users, coupons, returns, and related collections.

---

## Requirements

### Requirement 1: Homepage Hero — Static Banner Slider

**User Story:** As a Customer, I want a fast-loading homepage hero banner that showcases promotions clearly, so that I can immediately see current offers without waiting for complex animations to load.

#### Acceptance Criteria

1. THE Platform SHALL replace the existing canvas scroll-driven hero animation with a Swiper-powered static Banner_Slider component.
2. THE Banner_Slider SHALL display between 2 and 6 promotional banner slides, each containing a placeholder image area with descriptive text, a headline, a subheading, and a call-to-action button.
3. WHEN the homepage loads, THE Banner_Slider SHALL render the first slide within 100ms of first contentful paint without requiring JavaScript-driven canvas initialisation.
4. THE Banner_Slider SHALL support touch swipe navigation on mobile devices and arrow button navigation on desktop devices.
5. THE Banner_Slider SHALL auto-advance slides every 5 seconds with a pause-on-hover behaviour on desktop and pause-on-touch on mobile.
6. THE Banner_Slider SHALL use Swiper pagination dots to indicate the current slide position and total slide count.
7. THE Banner_Slider SHALL render all images using Next.js `<Image>` with `priority` set to `true` for the first slide and lazy loading for subsequent slides.

---

### Requirement 2: Typography System — Rem-Based Font Sizing

**User Story:** As a Customer, I want consistent and readable text across all devices, so that I can comfortably read product information regardless of my screen size.

#### Acceptance Criteria

1. THE Platform SHALL replace all viewport-width (vw) based font-size declarations with rem-based values tied to a root font-size of 16px.
2. THE Platform SHALL define a Tailwind CSS 4 typography scale using rem units: text-xs (0.75rem), text-sm (0.875rem), text-base (1rem), text-lg (1.125rem), text-xl (1.25rem), text-2xl (1.5rem), text-3xl (1.875rem), text-4xl (2.25rem), text-5xl (3rem).
3. THE Platform SHALL apply responsive font-size adjustments using Tailwind responsive prefixes (sm, md, lg) rather than vw calculations.
4. WHEN inspected at any viewport width between 375px and 2560px, THE Platform SHALL render text without horizontal overflow or text truncation caused by font sizing.

---

### Requirement 3: Product Grid — Clean Layout Without Animations

**User Story:** As a Customer, I want product listings to appear instantly without motion effects, so that I can browse products without layout shifts or delayed content rendering.

#### Acceptance Criteria

1. THE Platform SHALL remove all Framer Motion animation wrappers from the Product_Grid and ProductCard components.
2. THE Product_Grid SHALL render product cards using CSS Grid with immediate visibility and no entrance animations, fade-ins, or stagger delays.
3. THE Product_Grid SHALL display 2 columns below Breakpoint_Tablet (including Breakpoint_Mobile, 375px), and from Breakpoint_Tablet (768px) upward SHALL fit as many columns as the available width allows (typically 2 at tablet, 3 or 4 at Breakpoint_Desktop).
4. FROM Breakpoint_Tablet upward, THE Product_Grid SHALL use `grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr))`, and SHALL space cards with `gap`, not child margins, so card heights stay consistent within each row.
5. WHEN product data loads, THE Product_Grid SHALL transition from Skeleton_Loader placeholders directly to rendered product cards without intermediate animation states.

---

### Requirement 4: Responsive Layout — Stable Breakpoint System

**User Story:** As a Customer, I want the website layout to adapt reliably to my device width, so that I experience a polished interface on mobile, tablet, and desktop.

#### Acceptance Criteria

1. THE Platform SHALL maintain stable layouts at three primary breakpoints: 375px (mobile), 768px (tablet), and 1024px+ (desktop) without horizontal scrollbars or content overflow.
2. THE Platform SHALL set `overflow-x: hidden` on the root element and ensure no child element exceeds 100vw including padding and margins.
3. WHILE the viewport width is between 375px and 767px, THE Platform SHALL render single-column content layouts with a maximum content width of 100% and horizontal padding of 1rem.
4. WHILE the viewport width is between 768px and 1023px, THE Platform SHALL render tablet-optimised layouts with a maximum content width of 100% and horizontal padding of 2rem.
5. WHILE the viewport width is 1024px or greater, THE Platform SHALL render desktop layouts with a maximum content width of 1280px centered horizontally.
6. THE Platform SHALL test and maintain layout stability using Tailwind CSS 4 responsive utility classes without custom media query CSS that could conflict with the utility system.

---

### Requirement 5: Theme Switcher — Dark and Light Mode

**User Story:** As a Customer, I want to switch between dark and light themes, so that I can browse in comfort based on my environment and personal preference.

#### Acceptance Criteria

1. THE Platform SHALL integrate next-themes to provide dark, light, and system-preference theme modes.
2. THE Theme_Switcher component SHALL render a toggle control in the navigation bar allowing Customers to cycle between dark, light, and system modes.
3. WHEN a Customer selects a theme mode, THE Platform SHALL apply the theme immediately without a full page reload by toggling a CSS class on the `<html>` element.
4. THE Platform SHALL persist the selected theme in localStorage and restore the theme on subsequent visits.
5. WHEN a Customer has not explicitly selected a theme, THE Platform SHALL default to the operating system colour scheme preference via `prefers-color-scheme`.
6. THE Platform SHALL define dark and light colour tokens in the Tailwind CSS 4 configuration using CSS custom properties, covering: background, foreground, card, border, muted, accent, and destructive colours.
7. THE Platform SHALL ensure all text maintains a minimum contrast ratio of 4.5:1 against its background in both dark and light themes to meet WCAG 2.1 AA standards.

---

### Requirement 6: Skeleton Loaders — Loading State UI

**User Story:** As a Customer, I want visual placeholders while content loads, so that I perceive the page as fast and stable rather than empty or broken.

#### Acceptance Criteria

1. THE Platform SHALL render Skeleton_Loader components in place of product cards, banner slides, and content sections while data is being fetched from Firestore.
2. THE Skeleton_Loader components SHALL match the dimensions and layout of the content they replace to prevent cumulative layout shift.
3. THE Skeleton_Loader components SHALL display a pulsing animation using Tailwind CSS `animate-pulse` to indicate loading state.
4. WHEN data fetching completes, THE Platform SHALL replace Skeleton_Loader components with rendered content without intermediate blank states.
5. THE Platform SHALL provide Skeleton_Loader variants for: product cards (image + text lines), banner slides (full-width rectangle), text blocks (varied-width lines), and navigation elements.

---

### Requirement 7: Subtle Premium Section Design

_Amended 2026-10-11: replaces the original "Fuaark-inspired bold" direction, approved by the owner._

**User Story:** As a Customer, I want a calm, understated visual presentation, so that the shopping experience feels curated, premium and easy to browse.

#### Acceptance Criteria

1. THE Platform SHALL define these colour tokens in the Tailwind CSS 4 theme, with light as the default theme and a dark counterpart for each: canvas `#F7F5F2`, surface `#FFFFFF`, ink `#1A1A1A`, ink-muted `#6B6661`, line `#E4DFD8`, copper `#8C4A22`. Copper SHALL be used sparingly, as an accent only.
2. THE Platform SHALL use a maximum of two font families: a light serif for display headings (e.g. Cormorant Garamond via `next/font`) and Inter for body text, on a rem scale. Headings SHALL NOT be bold, and uppercase SHALL be used only for small labels.
3. THE Platform SHALL use a 4px spacing base, Section vertical spacing of 64px (mobile) and 96px (desktop), and Container gutters of 16px, 32px and 48px as the viewport widens. Spacing between siblings SHALL use `gap`, not child margins.
4. THE Container component SHALL be the only place that sets content max-width and horizontal gutters, and THE Section component SHALL be the only place that sets vertical section rhythm.
5. THE Platform SHALL structure homepage sections in this order: Banner_Slider, Category Showcase, Featured Products, Brand Story, Testimonials, and Newsletter.
6. THE header SHALL be a three-column grid with the logo on one line and only search, account and bag icons.
7. Product cards SHALL have square corners, no gradient overlays or shadows, at most one quiet text badge, and SHALL show a struck-through compare price instead of "% OFF" badges. Product images SHALL use `aspect-ratio: 3/4`.
8. Swiper controls SHALL be restyled to match the palette, and no content SHALL be hidden behind in-view animations.
9. WHEN an image slot has no image yet, THE Platform SHALL show a plain placeholder instead of a fallback photo.

---

### Requirement 8: Inventory Auto-Decrement on Order Placement

**User Story:** As an Admin, I want inventory to decrease automatically when an order is placed, so that stock counts remain accurate without manual adjustment.

#### Acceptance Criteria

1. WHEN a Customer successfully places an order, THE Inventory_Service SHALL decrement the `inventory` field of each ordered ProductVariant in Firestore within a single batch write or transaction.
2. THE Inventory_Service SHALL decrement inventory by the exact quantity ordered for each variant in the order.
3. IF a ProductVariant's inventory would drop below zero during the transaction, THEN THE Inventory_Service SHALL abort the entire order transaction and return an "Insufficient stock" error to the Customer.
4. WHEN inventory reaches zero for a ProductVariant, THE Platform SHALL reflect "Out of Stock" status on all pages displaying that variant within 5 seconds of the write completing (via Firestore real-time listeners or page revalidation).
5. THE Inventory_Service SHALL execute the decrement operation atomically to prevent race conditions when multiple Customers order the same variant concurrently.

---

### Requirement 9: Order Email Notifications via Resend

**User Story:** As a Customer, I want to receive email notifications about my order status, so that I stay informed about my purchase without checking the website repeatedly.

#### Acceptance Criteria

1. THE Platform SHALL implement a Next.js API route (`/api/send-order-email`) that sends transactional emails using the Resend API.
2. WHEN an order is placed successfully, THE Order_Email_Service SHALL send an order confirmation email to the Customer's registered email address containing: order ID, items ordered, total amount in INR, delivery address, and estimated delivery window.
3. WHEN an Admin updates an order status to "shipped", THE Order_Email_Service SHALL send a shipping notification email to the Customer containing: order ID, tracking information (if available), and estimated delivery date.
4. WHEN an Admin updates an order status to "delivered", THE Order_Email_Service SHALL send a delivery confirmation email to the Customer containing: order ID and a link to submit a product review.
5. IF the Resend API returns an error, THEN THE Order_Email_Service SHALL log the error with the order ID and email address, and retry the send operation once after a 5-second delay.
6. THE Order_Email_Service SHALL validate the recipient email address before sending and skip the send operation if the email is missing or malformed.

---

### Requirement 10: Return and Refund Flow — Customer Request

**User Story:** As a Customer, I want to request a return or refund for a purchased item, so that I can resolve issues with products that do not meet my expectations.

#### Acceptance Criteria

1. THE Platform SHALL provide a return request form accessible from the Customer's order history page for orders with status "delivered" and within 7 days of delivery date.
2. THE return request form SHALL collect: order ID, item(s) to return, reason for return (dropdown: defective, wrong item, size issue, changed mind, other), and additional comments (optional, max 500 characters).
3. WHEN a Customer submits a return request, THE Platform SHALL create a Return_Request document in Firestore with fields: `orderId`, `customerId`, `items`, `reason`, `comments`, `status` ("pending"), `createdAt` (server timestamp), and `updatedAt`.
4. WHEN a return request is submitted, THE Platform SHALL display a confirmation message with the return request ID and expected processing time of 3–5 business days.
5. THE Platform SHALL display all Customer return requests on the account page with current status: pending, approved, rejected, or refunded.
6. IF the order delivery date is more than 7 days ago, THEN THE Platform SHALL hide the return request option and display "Return window has expired" on the order detail.

---

### Requirement 11: Return and Refund Flow — Admin Management

**User Story:** As an Admin, I want to view and process return requests, so that I can approve or reject returns and initiate refunds efficiently.

#### Acceptance Criteria

1. THE AdminDashboard SHALL include a "Returns" tab displaying all Return_Request documents sorted by `createdAt` descending with columns: request ID, customer name, order ID, reason, status, and creation date.
2. WHEN an Admin clicks a return request, THE AdminDashboard SHALL display the full request details including ordered items, return reason, customer comments, and order history.
3. WHEN an Admin approves a return request, THE AdminDashboard SHALL update the Return_Request `status` to "approved" and the `updatedAt` timestamp in Firestore.
4. WHEN an Admin rejects a return request, THE AdminDashboard SHALL require a rejection reason (text input, min 10 characters) and update the Return_Request `status` to "rejected" with the reason stored in a `rejectionReason` field.
5. WHEN an Admin marks a return as "refunded", THE AdminDashboard SHALL update the Return_Request `status` to "refunded" and THE Inventory_Service SHALL increment the returned variant inventory by the returned quantity.
6. THE AdminDashboard SHALL support filtering return requests by status: all, pending, approved, rejected, refunded.

---

### Requirement 12: Legal Pages

**User Story:** As a Customer, I want to access Terms of Service, Privacy Policy, and Refund Policy pages, so that I understand the platform's legal obligations and my rights as a buyer.

#### Acceptance Criteria

1. THE Platform SHALL provide three statically rendered legal pages at routes: `/terms`, `/privacy`, and `/refund-policy`.
2. EACH Legal_Page SHALL contain structured content with headings, paragraphs, and numbered lists appropriate to the legal document type.
3. THE Platform footer SHALL include links to all three Legal_Pages visible on every page of the Platform.
4. THE checkout flow SHALL include a checkbox requiring the Customer to acknowledge the Terms of Service and Refund Policy before placing an order.
5. EACH Legal_Page SHALL include a "Last Updated" date displayed at the top of the page content.

---

### Requirement 13: Admin Coupon CRUD

**User Story:** As an Admin, I want to create, read, update, and delete coupon codes from the admin dashboard, so that I can manage promotions without modifying the database directly.

#### Acceptance Criteria

1. THE AdminDashboard SHALL include a "Coupons" tab displaying all documents from the Firestore `coupons` collection in a table with columns: code, discount percentage, active status, expiry date, and actions.
2. WHEN an Admin clicks "Create Coupon", THE AdminDashboard SHALL display a form with fields: code (uppercase string, required, unique), discount (integer 1–100, required), active (boolean toggle, default true), and expiresAt (date picker, optional).
3. WHEN an Admin submits the create coupon form, THE Platform SHALL validate the inputs using Zod and write a new document to the Firestore `coupons` collection.
4. IF a coupon code already exists in Firestore, THEN THE Platform SHALL display "Coupon code already exists" and prevent duplicate creation.
5. WHEN an Admin clicks "Edit" on a coupon, THE AdminDashboard SHALL populate the form with existing values and allow modification of discount, active status, and expiry date; the code field SHALL be read-only.
6. WHEN an Admin clicks "Delete" on a coupon, THE AdminDashboard SHALL display a confirmation dialog and upon confirmation delete the coupon document from Firestore.
7. THE coupon table SHALL support sorting by code, discount, and expiry date columns.

---

### Requirement 14: Google Analytics 4 Integration

**User Story:** As an Admin, I want GA4 tracking on all customer interactions, so that I can analyse traffic, conversions, and user behaviour to make data-driven business decisions.

#### Acceptance Criteria

1. THE Platform SHALL load the `gtag.js` script with the configured GA4 Measurement ID on all pages using the Next.js Script component with `strategy="afterInteractive"`.
2. THE Platform SHALL send a `page_view` event to GA4 on every route navigation using the Next.js App Router `usePathname` hook.
3. WHEN a Customer adds a product to the cart, THE Platform SHALL send an `add_to_cart` GA4 event with parameters: item_id, item_name, price, currency (INR), and quantity.
4. WHEN a Customer completes checkout, THE Platform SHALL send a `purchase` GA4 event with parameters: transaction_id, value, currency (INR), items array, and shipping cost.
5. WHEN a Customer views a product detail page, THE Platform SHALL send a `view_item` GA4 event with parameters: item_id, item_name, price, and currency (INR).
6. THE Platform SHALL respect the Customer's cookie/tracking consent preference and refrain from loading `gtag.js` if consent is denied.

---

### Requirement 15: Performance — Remove Framer Motion from Product Displays

**User Story:** As a Customer, I want product pages to load and render without JavaScript animation overhead, so that the shopping experience is smooth on all devices including low-end mobile phones.

#### Acceptance Criteria

1. THE Platform SHALL remove the Framer Motion library import from all Product_Grid, ProductCard, FeaturedProducts, and CategoryShowcase components.
2. THE Platform SHALL replace all Framer Motion entrance animations in product-related components with immediate CSS `opacity: 1` and `transform: none` styles.
3. WHEN Framer Motion is removed, THE Platform SHALL verify that the production JavaScript bundle size decreases by the full Framer Motion package size (approximately 30–40 KB gzipped).
4. THE Platform SHALL retain Framer Motion only in non-product components where its removal would break existing functionality (e.g., CartDrawer slide animation, AuthModal overlay).

---

### Requirement 16: Performance — Remove Scroll-Driven Hero

**User Story:** As a Customer, I want the homepage to load without a heavy scroll-driven canvas animation, so that the page reaches interactive state faster on mobile networks.

#### Acceptance Criteria

1. THE Platform SHALL remove the HeroSection canvas animation component and all associated scroll-position calculation logic.
2. THE Platform SHALL remove all hero image assets that were exclusively used for the canvas frame sequence from the project bundle.
3. WHEN the homepage loads, THE Platform SHALL achieve a Largest Contentful Paint (LCP) of 2.5 seconds or less on a simulated 4G connection as measured by Lighthouse.
4. THE Platform SHALL replace the canvas hero with the Banner_Slider component defined in Requirement 1.

---

### Requirement 17: Performance — Loading Skeletons and Fixed Rem Fonts

**User Story:** As a Customer, I want the page to feel stable and fast during loading, so that I do not experience layout jumps or text resizing after the page renders.

#### Acceptance Criteria

1. THE Platform SHALL achieve a Cumulative Layout Shift (CLS) score of 0.1 or less on all pages as measured by Lighthouse.
2. THE Platform SHALL render Skeleton_Loader components for all above-the-fold content that depends on asynchronous data fetching.
3. THE Platform SHALL ensure zero font-size recalculations after initial render by using fixed rem values rather than JavaScript-computed or vw-based sizes.
4. WHEN transitioning from Skeleton_Loader to rendered content, THE Platform SHALL maintain identical element dimensions to prevent layout shift.

