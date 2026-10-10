# Design Document — Virtual Try-On (Free, On-Device V1)

## Overview

The Try-On feature lets a Customer preview the currently selected outfit on a figure derived from their own uploaded photo, entirely for free and entirely in the browser. An open-source pose detector (MediaPipe Tasks / TensorFlow.js) locates body landmarks on the device, and the product's garment image is composited over the torso using those landmarks plus the entered height/size. The result is shown with a gentle animated (approximate 360°) presentation and is clearly labelled as an approximate visualization.

Two principles dominate the design:

1. **Privacy by architecture.** The uploaded photo never leaves the device in V1. It lives only in volatile memory (an in-memory `Blob` + object URL) and is destroyed on navigation, checkout, modal close, tab close, or inactivity timeout. Nothing is written to Firebase Storage, `localStorage`, `IndexedDB`, cookies, logs, or analytics.
2. **Provider abstraction.** All generation goes through a `TryOnProvider` interface. V1 is the on-device composite provider. A future photoreal AI provider (Vertex AI, FASHN) can be dropped in without changing the UI, consent flow, or privacy lifecycle — the only new obligation is disclosing external transmission in the T&C (gated by Requirement 6.5).

The feature integrates into the existing `ProductDetailClient.tsx` product page and reuses the app's Radix dialog, brand styling, `Button`, and image-management patterns.

## Architecture

```
Product_Page (ProductDetailClient.tsx)
   │  "Try On" button (CTA row, uses selectedSize + selectedVariant)
   ▼
TryOnModal (Radix Dialog, lazy-loaded)
   ├─ Step 1: Consent gate  ── T&C text + mandatory checkbox
   ├─ Step 2: Upload + inputs ── User_Photo (in-memory), height, size
   ├─ Step 3: Generate       ── TryOnProvider.generate(...)
   │                              └─ V1: OnDeviceCompositeProvider
   │                                   ├─ Pose_Engine (MediaPipe/TF.js, dynamic import)
   │                                   └─ canvas composite of Garment_Image over torso
   └─ Step 4: Preview        ── <TryOnViewer> animated approx-360 + Add to Cart
        │
        ▼  cleanup on: close / route change / checkout / tab close / timeout
   revoke object URLs, clear blobs, clear state  (useEphemeralImage)
```

### Module Layout

```
src/
├── components/product/
│   ├── ProductDetailClient.tsx        (existing — add "Try On" button + lazy modal)
│   └── tryon/
│       ├── TryOnModal.tsx             (Radix Dialog; step state machine)
│       ├── TryOnConsent.tsx           (T&C text + consent checkbox)
│       ├── TryOnUpload.tsx            (photo upload + height/size inputs)
│       ├── TryOnViewer.tsx            (composite canvas + approx-360 animation)
│       └── useEphemeralImage.ts       (in-memory image lifecycle + guaranteed cleanup)
├── services/tryon/
│   ├── types.ts                       (TryOnProvider interface, result types)
│   ├── onDeviceCompositeProvider.ts   (V1 free provider: pose + canvas overlay)
│   └── index.ts                       (provider selection / factory)
├── lib/
│   └── tryOnTerms.ts                  (T&C copy constant, shared with legal page)
└── config/tryon.ts                    (active provider id, limits, model asset URLs)
```

## Components and Interfaces

### `TryOnProvider` interface (`services/tryon/types.ts`)

```ts
export interface TryOnInput {
  photo: Blob;                 // in-memory only; never persisted
  garmentImageUrl: string;     // dedicated try-on image or product primary
  heightCm?: number;
  size?: string;
  gender?: 'men' | 'women' | 'unisex';
}

export interface TryOnResult {
  // Object URL(s) for the composite frame(s); revoked on cleanup.
  frames: string[];            // 1..n frames for the approx-360 animation
  primaryFrame: string;
  note: string;                // approximate-visualization notice
  landmarksFound: boolean;
}

export interface TryOnProvider {
  readonly id: string;
  readonly transmitsPhotoExternally: boolean; // false for on-device; true gates T&C disclosure
  isSupported(): Promise<boolean>;             // WebGL / model availability
  generate(input: TryOnInput, signal?: AbortSignal): Promise<TryOnResult>;
}
```

The UI depends only on this interface. `services/tryon/index.ts` returns the active provider from `config/tryon.ts` (`activeProviderId`), defaulting to the on-device provider.

### `OnDeviceCompositeProvider` (V1, free)

- **Pose detection:** dynamically imports `@mediapipe/tasks-vision` (PoseLandmarker) — free, Apache-2.0, runs on-device via WASM/WebGL. Model asset (`.task`) loaded from a configured URL (bundled in `public/` or a free CDN) only when Try-On is opened (Req 10.1).
- **Composite:** draws the User_Photo to an offscreen `<canvas>`, computes torso placement from shoulder/hip landmarks, then draws the Garment_Image (scaled by shoulder width and adjusted by height/size) over the torso. Produces a primary frame.
- **Approx-360 frames:** generates a few subtly transformed frames (slight horizontal skew/scale to simulate turning) for `TryOnViewer` to cycle. This is explicitly an approximation, not real 3D (Req 5.2).
- **No-landmark handling:** if PoseLandmarker returns no usable body, resolves with `landmarksFound: false` so the modal can show guidance (Req 4.3).
- `transmitsPhotoExternally = false`.

> Design note: the composite is a styling approximation. Quality is best with a front-facing, upper-body User_Photo and a clean-background Garment_Image. This is communicated via the Approximate_Notice and upload guidance.

### `useEphemeralImage` hook — the privacy core

Owns the lifecycle of the in-memory photo and derived frames and **guarantees cleanup**:

- Stores the `Blob` in a ref and an object URL in state; exposes `setPhoto(file)`, `clear()`.
- Registers cleanup that runs on: component unmount (modal close), `router` route change, `beforeunload`/`pagehide` (tab close), `visibilitychange` to hidden beyond a timeout, and an explicit inactivity timer.
- Cleanup revokes all object URLs, nulls the blob refs, and clears any `sessionStorage` scratch key. No persistent storage is ever used (Req 6.1–6.3).
- The checkout navigation case is covered by route-change cleanup (leaving the product route destroys the modal and its state).

### `TryOnModal` (Radix Dialog) — step state machine

```
consent → upload → generating → preview
   (any) → error;  close/route-change → cleanup
```

- **consent:** renders `TryOnConsent`; continue disabled until the checkbox is checked (Req 2.2, 2.4).
- **upload:** `TryOnUpload` — file picker (JPEG/PNG/WebP, size-limited), local preview via object URL, height input, size (prefilled from Selected_Outfit), replace/remove (Req 3).
- **generating:** calls `provider.generate(...)` with an `AbortSignal`; shows progress; abortable.
- **preview:** `TryOnViewer` shows the composite with the approx-360 animation and an Add-to-Cart action that reuses the existing cart logic (Req 5.4).
- Matches the app's other Radix dialogs for a11y (labels/roles, keyboard) (Req 10.2).

### `ProductDetailClient` integration

- Add a "Try On" button to the existing CTA row (next to Add to Cart / wishlist / share). It reuses the existing size-selection guard: if the product has sizes and none is selected, prompt to select a size first (Req 1.3).
- The modal is **lazily imported** (`next/dynamic` with `ssr: false`) so pose/model code and the modal are not in the initial product-page bundle (Req 10.1).
- On open, pass `{ product, size: selectedSize, variant: selectedVariant }` as the Selected_Outfit.

### Per-product Try-On image (admin, optional)

- Extend `Product` with an optional `tryOnImage?: string` (a clean cutout URL). Provider prefers it; falls back to `images` primary (Req 9.1, 9.2, 4.4).
- Setting it reuses the existing admin `ProductImageManager` / product form image upload — admin-gated by the existing `ProtectedRoute`/Firestore rules (Req 9.3). No new write surface.

## Terms & Conditions copy (`lib/tryOnTerms.ts`)

Shown in the consent gate and mirrored on a legal page. Draft copy:

- **Your photo stays on your device.** For this free Try-On, your uploaded photo is processed entirely in your browser and is held only in temporary memory for this session. It is never uploaded to Wefton, never saved, and never shared with anyone. It is permanently deleted the moment you go to checkout, move to another page, close this window, or leave the site.
- **Upload only your own photo.** Please upload a photo of yourself only. Do not upload photos of children, of other or familiar people, or any confidential, private, or restricted images. By continuing you confirm the photo is of you and that you have the right to use it.
- **Approximate visualization.** This preview is an approximate styling visualization, not a photograph, and not an exact representation of fit, size, colour, drape, or appearance. Use it as a rough guide only.
- **No liability for misuse.** Wefton Copper is not responsible for any misuse, misinterpretation, or consequences of graphical content generated through this feature. Do not use this feature to create misleading, harmful, or non-consensual imagery.

(When a future paid provider is enabled, an additional clause disclosing external processing and the provider's non-retention policy is added — Req 6.5.)

## Data Model

- `Product.tryOnImage?: string` — optional clean cutout URL. No other schema changes.
- **No storage of user photos anywhere.** No Firestore, Storage, or analytics writes involving the User_Photo.

## Security & Privacy

- On-device only in V1; `transmitsPhotoExternally = false`. No network egress of the photo (Req 6.4).
- Guaranteed cleanup via `useEphemeralImage` across all exit paths (Req 6.2).
- Consent gate + child-safety/own-photo prohibitions + misuse disclaimer (Req 2, 7).
- No save/share/export of composites depicting a person beyond an optional local user-initiated download of their own result (Req 7.3).
- Served over HTTPS (Req 10.5).

## Dependencies

- `@mediapipe/tasks-vision` (Apache-2.0) for on-device pose landmarks — free, no API key. Loaded via dynamic import only within the Try-On path.
- No paid SDKs. Canvas compositing uses the built-in Canvas API.

## Error Handling

- Unsupported browser / WebGL or model load failure → `isSupported()` false → modal shows a graceful "not available on this device/browser" message (Req 10.3).
- No body landmarks → guidance message, allow retry with a better photo (Req 4.3).
- Invalid/oversized file → inline error, no progression (Req 3.3).
- All messages are non-technical.

## Testing Strategy

- Unit: torso placement math (landmarks → garment transform); provider factory selection; T&C copy presence of the four mandated clauses; ephemeral cleanup logic (object URL revocation invoked on each exit path via mocked events).
- Component: consent gate disables upload until checked; upload validation; no-landmark path shows guidance.
- Manual: real photo across a few products; verify photo is never sent on the network (DevTools), and that navigating to checkout / closing the modal clears the preview and revokes URLs; verify lazy loading keeps the model out of the initial product bundle; `next build` passes.

## Rollout / Future Upgrade

1. Ship V1 on-device provider (free), labelled as approximate.
2. Add per-product try-on cutout images for best-selling products to improve composite quality.
3. If/when budget exists, implement a paid `TryOnProvider` (Vertex AI / FASHN) behind the same interface, add the external-processing T&C clause, and flip `activeProviderId` — no UI or privacy-lifecycle rewrite.
