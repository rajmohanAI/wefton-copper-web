# Implementation Plan: Bulk Inventory / Product Upload (CSV & Excel)

## Overview

This plan implements a browser-side CSV/`.xlsx` bulk import in the Wefton Copper admin (`wefton-copper/wefton-platform`) with two modes — Update Stock and Create Products — using a parse → validate → preview → commit flow. All writes use the existing Firebase client SDK and are gated by the existing admin auth + Firestore rules. Tasks build bottom-up: dependencies and schemas, then the service (parse/validate/commit), then the UI, then wiring into the admin dashboard, then tests. Per the workspace rule, consult the Next.js 16 docs under `node_modules/next/dist/docs/` before writing any route/component code that touches framework conventions.

## Tasks

- [ ] 1. Dependencies and templates foundation
  - [ ] 1.1 Add `papaparse`, `@types/papaparse`, and `xlsx` to `package.json` and install
    - Pin exact versions; confirm they build on the App Hosting Node runtime
    - _Requirements: 2.1, 2.2, 9.2_
  - [ ] 1.2 Create `src/lib/bulkImportTemplates.ts`
    - Define canonical headers for both modes; generate a downloadable template CSV (headers + example row) as a Blob
    - _Requirements: 3.3_

- [ ] 2. Validation schemas
  - [ ] 2.1 Create `src/lib/bulkImportSchemas.ts`
    - `stockRowSchema` (sku, inventory>=0 int, optional mode set|delta)
    - `productRowSchema` mirroring `productFormSchema` field rules (title, category, gender enum, price>=0, sku, inventory>=0) plus coerced optional fields (tags/images split, booleans, comparePrice)
    - _Requirements: 4.1, 4.6, 5.1, 5.2, 5.6, 6.5_

- [ ] 3. Import service — parsing
  - [ ] 3.1 Create `src/services/bulkImportService.ts` with `parseFile(file)`
    - Dynamic-import `papaparse` for `.csv` and `xlsx` for `.xlsx`; return a common `ParsedRow[]`
    - Normalise headers (lowercase/trim) → canonical column map (order-independent)
    - Handle parse failure, empty file, unsupported format; enforce max rows/size
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [ ] 4. Import service — validation
  - [ ] 4.1 Load an existing-products snapshot helper
    - One-time `products` read reused across the whole preview (avoid per-row reads)
    - _Requirements: 4.2, 5.7_
  - [ ] 4.2 Implement `validateStockRows(rows, products)`
    - Match sku→variant, else sku→product; flag no-match as error; validate inventory; build `plan` of inventory updates; classify applicable/skipped/error
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.2_
  - [ ] 4.3 Implement `validateProductRows(rows, products)`
    - Zod-validate rows; auto-`slugify` when slug missing; group variant rows by slug; sum variant inventory into product-level; skip duplicate slugs; apply defaults
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.1, 6.2_

- [ ] 5. Import service — commit
  - [ ] 5.1 Implement `commit(outcome, onProgress)` with batched writes
    - `writeBatch` chunks of ≤400 ops; independent awaits; per-row success/failure roll-up
    - _Requirements: 7.1, 7.2, 7.3, 8.4_
  - [ ] 5.2 Update-stock commit path
    - Recompute variants + product-level inventory; `batch.update` only inventory fields + `updatedAt`; preserve all other fields; idempotent absolute set
    - _Requirements: 4.3, 4.7, 7.4, 8.1_
  - [ ] 5.3 Create-products commit path
    - Batch `set` new docs with `createProduct` defaults (`ratings`/`reviewsCount`/badges/`createdAt`); images from URL strings; skip duplicate slugs
    - _Requirements: 5.4, 5.8, 8.2_

- [ ] 6. UI — Bulk Import modal
  - [ ] 6.1 Create `src/components/admin/bulk/useBulkImport.ts`
    - State machine idle→parsing→parsed→validating→previewed→committing→done→error; expose actions + progress
    - _Requirements: 6.1, 6.3, 8.3, 8.4_
  - [ ] 6.2 Create `src/components/admin/bulk/BulkImportModal.tsx`
    - Radix Dialog (match ProductFormModal styling): mode toggle, template download, file drop, preview screen, commit with progress, result summary
    - Disable commit while committing; require explicit confirm after preview
    - _Requirements: 2.1, 3.1, 3.3, 6.3, 6.4, 7.5, 8.3, 8.5_
  - [ ] 6.3 Create `src/components/admin/bulk/ImportPreviewTable.tsx`
    - Tabs Applicable / Skipped / Errors; summary counts; per-row error rows with number + reason
    - _Requirements: 6.1, 6.2_
  - [ ] 6.4 Error Report download
    - Generate a CSV of failed/error rows with reasons for download from the result screen
    - _Requirements: 7.5_

- [ ] 7. Per-product image upload
  - [ ] 7.1 Extract shared upload helper `src/services/productImageService.ts`
    - `uploadProductImages(productId, files): Promise<ProductImage[]>` using the existing Storage path/validation; refactor `ProductFormModal` to use it (no behaviour change)
    - _Requirements: 10.3, 10.4_
  - [ ] 7.2 Create `src/components/admin/ProductImageManager.tsx` (Radix Dialog)
    - Show existing images; multi-file add; remove; set-primary; drag-to-reorder; progress; disable save while uploading
    - Persist ordered `images` via `updateProduct(productId, { images })`; partial-failure keeps uploaded images + allows retry
    - _Requirements: 10.2, 10.3, 10.5, 10.6, 10.7, 10.8, 10.9_
  - [ ] 7.3 Wire "Manage Images" action into `ProductsTab.tsx`
    - Per-row action opens the manager; refresh row after save; flag rows with empty `images`
    - _Requirements: 10.1, 10.10_

- [ ] 8. Wire bulk import into the admin dashboard
  - [ ] 8.1 Add a "Bulk Import" button to `ProductsTab.tsx` that opens `BulkImportModal`
    - Refresh the product list after a successful commit
    - _Requirements: 1.1, 9.1, 9.4_
  - [ ] 8.2 Confirm admin gating
    - Verify the panel is only reachable within the `ProtectedRoute requireAdmin` admin route; no customer-facing exposure
    - _Requirements: 1.1, 1.3, 9.3_

- [ ] 9. Testing and verification
  - [ ] 9.1 Unit tests (Vitest)
    - Header mapping (order-independent); schema validation incl. invalid gender/negative price/non-numeric inventory; sku matching + no-match error; variant grouping + inventory sum; duplicate-slug skip; idempotent set; batch chunking (900 rows → 3 batches)
    - _Requirements: 2.4, 4.2, 4.5, 4.6, 5.5, 5.7, 6.1, 7.2, 8.1, 8.2_
  - [ ] 9.2 Manual end-to-end
    - Import sample `.csv` and `.xlsx` for both modes against a test project; verify preview counts, commit results, Error Report
    - Upload multiple images to an imported product; verify order, primary selection, and storefront display
    - _Requirements: 2.1, 2.2, 6.2, 7.5, 10.6, 10.7_
  - [ ] 9.3 Run `next build` and fix any errors; confirm parsers not in customer bundle
    - _Requirements: 9.2, 9.3_
