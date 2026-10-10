# Design Document — Bulk Inventory / Product Upload (CSV & Excel)

## Overview

This design adds a bulk import capability to the Wefton Copper admin dashboard. An Admin uploads a CSV or `.xlsx` file, picks a mode (Update Stock or Create Products), reviews a validated preview, and commits. All parsing and validation happen in the browser; all writes use the existing Firebase **client** SDK and are authorised by the existing admin auth + Firestore rules. No server infrastructure (`firebase-admin`, API routes) is added.

The design deliberately reuses existing building blocks: the `products` collection and `Product`/`ProductVariant` shapes (`src/types/index.ts`), `productService.ts` (`createProduct`/`updateProduct`), `inventoryService.ts` (variant/product-level stock model), `slugify` (`src/lib/utils.ts`), the project's Zod validation approach (`src/lib/schemas.ts`), Radix Dialog, and brand styling tokens.

## Architecture

The import lives entirely inside the admin route (`/admin`), which is already wrapped in `<ProtectedRoute requireAdmin>`. A new "Import" affordance in the Products tab opens the Import Panel. Parsing libraries load only within this admin code path, keeping them out of the customer bundle.

### High-Level Flow

```
Admin (in /admin Products tab)
   │  clicks "Bulk Import"
   ▼
┌────────────────────────── Import Panel (client) ──────────────────────────┐
│ 1. Choose mode: [Update Stock] | [Create Products]                         │
│ 2. Download template (optional)                                            │
│ 3. Select .csv / .xlsx file                                                │
│        │                                                                   │
│        ▼   parseFile()  ── papaparse (csv) | xlsx (xlsx) ──> Row[]         │
│ 4. Normalise headers (lowercase/trim) → map to canonical columns          │
│        │                                                                   │
│        ▼   validateRows(mode, rows)  ── Zod per-row + cross-ref Firestore  │
│ 5. PREVIEW: applicable / skipped / error counts + per-row error list      │
│        │                                                                   │
│        ▼   Admin confirms  (Commit)                                        │
│ 6. commit()  ── batched writes via productService / inventory logic ──────┼──> Firestore `products`
│        │                                                                   │
│        ▼                                                                   │
│ 7. RESULT: created / updated / skipped / failed + Error Report download    │
└────────────────────────────────────────────────────────────────────────────┘
```

### Module Layout

```
src/
├── components/admin/
│   ├── AdminDashboard.tsx            (existing — add "Bulk Import" entry in Products tab)
│   ├── ProductsTab.tsx               (existing — add button that opens the panel)
│   ├── bulk/
│   │   ├── BulkImportModal.tsx       (Radix Dialog: mode select, file input, preview, commit, result)
│   │   ├── ImportPreviewTable.tsx    (renders applicable/skipped/error rows)
│   │   └── useBulkImport.ts          (hook: state machine idle→parsed→validated→committing→done)
│   └── ProductImageManager.tsx       (Radix Dialog: per-product multi-image upload/reorder/primary)
├── services/
│   └── bulkImportService.ts          (parse, validate, commit; pure-ish, testable)
├── lib/
│   ├── bulkImportSchemas.ts          (Zod schemas for stock rows and product rows)
│   └── bulkImportTemplates.ts        (header definitions + template CSV generators)
```

## Components and Interfaces

### `bulkImportService.ts` (core logic)

```ts
type ImportMode = 'update-stock' | 'create-products';

interface ParsedRow { rowNumber: number; raw: Record<string, string>; }

interface RowResult {
  rowNumber: number;
  status: 'applicable' | 'skipped' | 'error';
  message?: string;                 // reason for skip/error
  action?: 'create' | 'update-stock';
  targetProductId?: string;         // resolved match (update mode)
}

interface ValidationOutcome {
  mode: ImportMode;
  results: RowResult[];
  applicable: number; skipped: number; errors: number;
  plan: CommitItem[];               // validated, ready-to-write units
}

// Parsing — dynamic import so parsers stay in the admin chunk
async function parseFile(file: File): Promise<ParsedRow[]>;      // .csv via papaparse, .xlsx via xlsx

// Validation — pure over rows + a snapshot of existing products
async function validateStockRows(rows: ParsedRow[], products: Product[]): Promise<ValidationOutcome>;
async function validateProductRows(rows: ParsedRow[], products: Product[]): Promise<ValidationOutcome>;

// Commit — batched writes; returns a per-item outcome
async function commit(outcome: ValidationOutcome,
                      onProgress?: (done: number, total: number) => void): Promise<CommitResult>;
```

Design notes:
- Parsers are loaded with dynamic `import()` inside `parseFile` so `papaparse`/`xlsx` are only fetched when an admin actually imports — not in the customer bundle (Req 9.2).
- Header normalisation: lowercase + trim header names, build a `Record<canonicalColumn, value>` per row so column order does not matter (Req 2.4).
- Validation reads a one-time snapshot of existing products (via `getDocs(collection(db,'products'))` or a `productService` helper) to resolve `sku`/`slug` matches and detect duplicates. This snapshot is reused for the whole preview to avoid per-row reads.

### Column Schemas

**Update Stock mode** (row = one SKU):

| Column | Required | Notes |
|---|---|---|
| `sku` | yes | Matches a `ProductVariant.sku`, else product-level `Product.sku` |
| `inventory` | yes | Non-negative integer; absolute value by default |
| `mode` | no | `set` (default) or `delta` (add/subtract) per Req 4.4 |

**Create Products mode** (row = one product; variants either grouped by `slug` across rows or in a `variants` JSON column):

| Column | Required | Notes |
|---|---|---|
| `title` | yes | |
| `category` | yes | Category slug |
| `gender` | yes | `men` \| `women` \| `unisex` |
| `price` | yes | Non-negative number (INR rupees) |
| `sku` | yes | Product-level SKU |
| `inventory` | yes | Non-negative integer (product-level; recomputed from variants if variants provided) |
| `slug` | no | Auto from `title` via `slugify` if omitted |
| `description`, `shortDescription`, `subcategory`, `comparePrice`, `tags`, `featured`, `bestseller`, `newArrival`, `images` | no | `tags`/`images` are pipe- or comma-separated lists; booleans accept `true/false/1/0/yes/no` |
| `variantSize`, `variantColor`, `variantColorHex`, `variantInventory`, `variantSku` | no | Row-per-variant grouping key = product `slug` (or `sku`) |

### Zod Schemas (`bulkImportSchemas.ts`)

- `stockRowSchema`: `{ sku: nonEmpty, inventory: coerce int >= 0, mode?: enum['set','delta'] }`.
- `productRowSchema`: mirrors `productFormSchema` field rules (title, category, gender enum, price >= 0, sku, inventory >= 0) plus optional fields coerced from strings (tags split, booleans parsed, comparePrice optional number).
- Reusing the same field rules as `productFormSchema` keeps bulk-created products consistent with modal-created ones (Req 6.5).

### Variant Grouping (Create mode)

When variant columns are present, rows sharing the same `slug` (or product `sku`) are grouped into one Product with a `variants[]` array. Each variant gets a `variantId` via `crypto.randomUUID()` (same as `ProductFormModal`). Product-level `inventory` is set to the sum of variant inventories; if no variant rows, product-level `inventory` is taken from the row.

### Commit Strategy

- Use Firestore `writeBatch` in chunks of up to 400 operations (under the 500 hard limit for safety) (Req 7.2).
- **Update Stock**: for each matched product, compute the new `variants[]` (variant inventory set/delta) and new product-level `inventory` (sum of variants, or direct set when no variants), then `batch.update(productRef, { variants, inventory, updatedAt })`. Only inventory fields change (Req 4.7, 7.4). This mirrors `inventoryService` semantics but sets absolute values from the file.
- **Create Products**: `addDoc`-equivalent via batch `set` on a new doc ref with `createProduct` defaults (`ratings: 0`, `reviewsCount: 0`, badges, `createdAt: serverTimestamp()`) (Req 5.8). Duplicate `slug` rows are skipped (Req 5.7, 8.2). Images come straight from URL/path strings — no Storage upload (Req 5.4).
- Progress callback fires per batch so the UI can show "N of M processed" (Req 8.4).
- Partial-failure handling: each batch is awaited independently; failures are recorded per affected row and rolled up into the result and Error Report (Req 7.3, 7.5).

### UI — `BulkImportModal.tsx`

Radix `Dialog` (matching `ProductFormModal`), brand tokens. State machine via `useBulkImport`:

```
idle → (file + mode) → parsing → parsed → validating → previewed
       → (commit) → committing → done
       (any step) → error
```

Screens: (1) mode toggle + template download + file drop; (2) preview table with tabs Applicable / Skipped / Errors and summary counts; (3) commit button (disabled while committing, Req 8.3) with progress; (4) result summary + "Download error report" (CSV) (Req 7.5).

### Templates (`bulkImportTemplates.ts`)

Generates a downloadable CSV per mode with headers + one example row, produced client-side as a Blob download (Req 3.3). No new dependency needed for generation.

### `ProductImageManager.tsx` (per-product images)

A focused, image-only dialog opened from a "Manage Images" action on each row in `ProductsTab`. It reuses the exact upload logic already proven in `ProductFormModal`:

- Multi-file selection (JPEG/PNG/WebP, same size limit), uploaded to `products/{productId}/{Date.now()}-{filename}` via `uploadBytes` + `getDownloadURL` (`getFirebaseStorage()`).
- Shows existing `images` with thumbnails; supports remove, drag-to-reorder, and a single "Set primary" toggle (`isPrimary`). The primary (or first) image is what the storefront already uses as the main image.
- On save, persists the full ordered `images` array via `updateProduct(productId, { images })`.
- Per-file upload progress; save disabled during upload; partial-failure reporting keeps already-uploaded images and allows retry (Req 10.8, 10.9).

This is intentionally separate from `BulkImportModal` because it operates on one existing product at a time (typically a freshly imported one). `ProductsTab` also flags rows whose `images` array is empty so admins can find products needing images after a bulk create (Req 10.10). To avoid duplication, the shared upload routine (`uploadProductImages(productId, files) → ProductImage[]`) is extracted into a small helper (e.g. `src/services/productImageService.ts` or a shared hook) and used by both `ProductFormModal` and `ProductImageManager`.

## Data Model

No changes to the `Product`/`ProductVariant` types are required — the feature writes the existing shape. Inventory continues to be tracked at product level and per variant, and Update Stock keeps product-level `inventory` as the sum of variant inventories (consistent with `inventoryService.decrementInventory`).

## Security

- No new write surface: the panel uses the same client SDK writes an admin already performs via the modal, so the existing `products` Firestore rule (`allow write: if isAdmin()`) is the authoritative guard (Req 1.2).
- The route is admin-gated by the existing `ProtectedRoute` (Req 1.1, 1.3).
- Image values are treated as plain URLs/paths; no HTML is rendered from file content, avoiding injection.

## Dependencies

- `papaparse` (+ `@types/papaparse`) — robust CSV parsing.
- `xlsx` (SheetJS community build) — `.xlsx` reading. Loaded via dynamic import within the admin path only (Req 9.2).

## Error Handling

- Parse failure → clear message, stay on step 1 (Req 2.3).
- Missing required columns for the chosen mode → listed before preview (Req 3.2).
- Per-row validation errors → shown with row number + reason; valid rows may still be committed (Req 6.2, 6.4).
- Commit failures → per-row, surfaced in result + downloadable Error Report; no silent loss (Req 7.3).
- All messages non-technical, no stack traces (Req 8.5).

## Testing Strategy

- Unit (Vitest, already in project):
  - Header normalisation and column mapping (order-independent).
  - `stockRowSchema` / `productRowSchema` validation incl. invalid gender, negative/non-numeric price and inventory.
  - SKU→variant and SKU→product matching; no-match flagged as error (update mode).
  - Variant grouping by slug; product-level inventory = sum of variants.
  - Duplicate-slug skip (create mode); idempotent absolute set (update mode).
  - Batch chunking (e.g. 900 rows → 3 batches at 400).
- Integration/manual: import sample CSV and `.xlsx` for both modes against a test project; verify preview counts, commit results, and Error Report contents; confirm `next build` passes.

## Rollout

1. Land behind the admin Products tab; verify with small files first.
2. Provide the two Template_Files to the store team so their sheets match the expected headers.
3. Optionally add a dry-run reminder in the UI (preview is always required before commit).
