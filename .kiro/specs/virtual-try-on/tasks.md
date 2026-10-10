# Implementation Plan: Virtual Try-On (Free, On-Device V1)

## Overview

This plan implements a free, in-browser Try-On on the Wefton Copper product page (`wefton-copper/wefton-platform`). Body landmarks are detected on-device with `@mediapipe/tasks-vision`, and the product garment image is composited over the figure on a canvas. The uploaded photo is handled ephemerally (in-memory only, guaranteed cleanup) and never uploaded. Generation is behind a `TryOnProvider` interface so a paid AI provider can replace V1 later without UI or privacy changes. Tasks build bottom-up: config/types/terms → provider → ephemeral hook → UI steps → product-page wiring → optional admin try-on image → tests/build. Per the workspace rule, consult the Next.js 16 docs under `node_modules/next/dist/docs/` before writing dynamic-import/component code.

## Tasks

- [ ] 1. Foundations: dependency, config, types, terms
  - [ ] 1.1 Add `@mediapipe/tasks-vision` to `package.json` and install
    - _Requirements: 4.1, 10.1_
  - [ ] 1.2 Create `src/config/tryon.ts`
    - `activeProviderId`, file size limit, accepted types, model asset URL, inactivity timeout
    - _Requirements: 3.1, 8.4, 6.2_
  - [ ] 1.3 Create `src/services/tryon/types.ts`
    - `TryOnInput`, `TryOnResult`, `TryOnProvider` interface (incl. `transmitsPhotoExternally`, `isSupported`, `generate`)
    - _Requirements: 8.1, 8.3_
  - [ ] 1.4 Create `src/lib/tryOnTerms.ts`
    - The four mandated clauses (ephemeral deletion, own-photo-only + no children, approximate visualization, no-liability/misuse)
    - _Requirements: 2.3, 7.1, 7.5, 4.5_

- [ ] 2. On-device composite provider (free V1)
  - [ ] 2.1 Implement `src/services/tryon/onDeviceCompositeProvider.ts`
    - Dynamic-import PoseLandmarker; `isSupported()` (WebGL/model); detect landmarks; return `landmarksFound:false` when none
    - _Requirements: 4.1, 4.2, 4.3, 10.3_
  - [ ] 2.2 Canvas composite + approx-360 frames
    - Place garment over torso from shoulder/hip landmarks, scale by shoulder width + height/size; generate a few skewed frames; attach approximate-visualization note; `transmitsPhotoExternally=false`
    - _Requirements: 4.2, 4.4, 4.5, 5.2_
  - [ ] 2.3 Create `src/services/tryon/index.ts` provider factory
    - Return active provider from config; default on-device
    - _Requirements: 8.2, 8.4_

- [ ] 3. Ephemeral image lifecycle (privacy core)
  - [ ] 3.1 Implement `src/components/product/tryon/useEphemeralImage.ts`
    - In-memory blob + object URL; `setPhoto`/`clear`; cleanup on unmount, route change, `beforeunload`/`pagehide`, visibility timeout, inactivity timer; revoke URLs; never persist
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 4. Try-On UI
  - [ ] 4.1 Create `src/components/product/tryon/TryOnConsent.tsx`
    - Scrollable T&C from `tryOnTerms`; mandatory checkbox; continue disabled until checked
    - _Requirements: 2.1, 2.2, 2.4, 2.5_
  - [ ] 4.2 Create `src/components/product/tryon/TryOnUpload.tsx`
    - File picker (type/size validated), local object-URL preview, height input, size prefilled from Selected_Outfit, replace/remove
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ] 4.3 Create `src/components/product/tryon/TryOnViewer.tsx`
    - Show composite; animated approx-360 (cycle frames / sway) with explicit approximation label; re-generate; Add to Cart (reuse cart logic)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ] 4.4 Create `src/components/product/tryon/TryOnModal.tsx`
    - Radix Dialog state machine consent→upload→generating→preview→error; abortable generate; a11y (labels/roles/keyboard); no-landmark guidance
    - _Requirements: 2.4, 4.3, 5.1, 10.2, 10.3_

- [ ] 5. Product page integration
  - [ ] 5.1 Add "Try On" button to `ProductDetailClient.tsx` CTA row
    - Size-selection guard (same as Add to Cart); pass Selected_Outfit (product + selectedSize + selectedVariant)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 5.2 Lazy-load the modal
    - `next/dynamic` (`ssr:false`) so pose/model + modal are excluded from the initial product bundle
    - _Requirements: 10.1, 10.4_

- [ ] 6. Optional per-product try-on image (admin)
  - [ ] 6.1 Add `tryOnImage?: string` to the `Product` type
    - Provider prefers it, else primary image
    - _Requirements: 9.1, 9.2, 4.4_
  - [ ] 6.2 Allow setting it via existing admin image management (admin-gated)
    - Reuse ProductImageManager/product form where practical; no new write surface
    - _Requirements: 9.3_

- [ ] 7. Legal page reference
  - [ ] 7.1 Surface the Try-On terms on a legal/reference page
    - Reuse `tryOnTerms` copy so modal and legal page stay in sync
    - _Requirements: 2.5_

- [ ] 8. Testing and verification
  - [ ] 8.1 Unit tests (Vitest)
    - Torso placement math; provider factory; T&C contains the four clauses; ephemeral cleanup revokes URLs on each exit path (mocked events)
    - _Requirements: 4.2, 8.2, 2.3, 6.2_
  - [ ] 8.2 Manual verification
    - Real photo across products; confirm via DevTools the photo never egresses the network (V1); navigating to checkout / closing modal clears preview + revokes URLs; unsupported-device message; lazy-load keeps model out of initial bundle
    - _Requirements: 6.1, 6.4, 10.1, 10.3_
  - [ ] 8.3 Run `next build`; fix errors; confirm mediapipe not in the customer product-page entry bundle
    - _Requirements: 10.1, 10.4_
