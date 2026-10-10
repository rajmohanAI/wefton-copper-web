# Requirements Document

## Introduction

This document defines the requirements for a bulk product and inventory upload feature in the Wefton Copper admin dashboard. Today an Admin adds or edits products one at a time through a modal form (`ProductFormModal`), and there is no way to update stock across many products at once. This feature lets an Admin upload a CSV or Excel (`.xlsx`) file to either (a) update inventory levels on existing products and their variants in bulk, or (b) create multiple new products at once. It also lets an Admin upload multiple images directly against each product from the dashboard after import, since products created from a file need not carry image files in the upload.

The feature adds an Import area to the Products section of the admin dashboard. It parses the uploaded file in the browser, validates every row, shows a preview of exactly what will change (with per-row errors), and only writes to Firestore after the Admin confirms. All writes use the existing Firebase client SDK and are gated by the existing admin authentication and Firestore security rules — no new server infrastructure is introduced.

The platform is a Next.js 16 application (React 19, TypeScript) on Firebase App Hosting for the Firebase project `weflive-58678`. Products live in the Firestore `products` collection; prices are in Indian Rupees (INR) as whole numbers; inventory is tracked at both product level (`Product.inventory`) and per variant (`ProductVariant.inventory`).

---

## Glossary

- **Platform**: The Wefton Copper Next.js 16 web application (`wefton-copper/wefton-platform`).
- **Admin**: An authenticated user with `role: "admin"` in Firestore, permitted to manage products.
- **Import_Panel**: The new admin UI for uploading and committing a bulk file, located in the Products section of the admin dashboard.
- **Upload_File**: The CSV or `.xlsx` file provided by the Admin.
- **Row**: A single data record in the Upload_File (one line in CSV, one sheet row in Excel), excluding the header row.
- **Update_Stock_Mode**: The import mode that adjusts inventory on existing products/variants without creating new products.
- **Create_Products_Mode**: The import mode that creates new products from the Upload_File.
- **Match_Key**: The identifier used to locate the target record — `sku` for variant/product matching, or `slug` for product matching.
- **Product**: A document in the Firestore `products` collection, typed by the `Product` interface.
- **Variant**: A size/colour combination inside a Product's `variants` array, typed by `ProductVariant`, each optionally carrying its own `sku` and `inventory`.
- **Preview**: The validated, human-readable summary shown before committing, listing rows to be applied, rows skipped, and rows with errors.
- **Commit**: The action that writes the validated rows to Firestore.
- **Error_Report**: The downloadable or viewable list of rows that failed validation, with reasons.
- **Template_File**: A downloadable sample file with the correct column headers for a given mode.
- **Product_Service**: The Firestore product module (`src/services/productService.ts`).
- **Inventory_Service**: The stock module (`src/services/inventoryService.ts`).
- **INR**: Indian Rupee (₹), the sole currency of the Platform.
- **Firestore**: The Firebase Cloud Firestore database.

---

## Requirements

### Requirement 1: Access Control

**User Story:** As the Platform owner, I want bulk upload restricted to admins, so that only authorised users can change products and stock.

#### Acceptance Criteria

1. THE Import_Panel SHALL be reachable only from an admin-gated route, consistent with the existing `ProtectedRoute` admin protection on the admin dashboard.
2. THE Platform SHALL rely on the existing Firestore security rules (`products` writes allowed only when the requester is an Admin) as the authoritative server-side check for all Commit writes.
3. WHEN a non-admin attempts to access the Import_Panel, THE Platform SHALL redirect them away from the admin area as the existing dashboard does.

### Requirement 2: File Upload and Format Support

**User Story:** As an Admin, I want to upload either a CSV or an Excel file, so that I can use whichever format my data is in.

#### Acceptance Criteria

1. THE Import_Panel SHALL accept files with `.csv` and `.xlsx` extensions.
2. THE Import_Panel SHALL parse CSV files and Excel (`.xlsx`) files into a common row structure for validation.
3. IF the Upload_File cannot be parsed (corrupt, empty, or unsupported format), THEN THE Import_Panel SHALL display a clear error and SHALL NOT proceed to Preview.
4. THE Import_Panel SHALL treat the first row as a header row and map columns by header name (case-insensitive, trimmed), not by position.
5. THE Import_Panel SHALL enforce a reasonable maximum row count and file size, and SHALL warn the Admin WHEN the file exceeds the supported limit.

### Requirement 3: Import Mode Selection

**User Story:** As an Admin, I want to choose whether I am updating stock or creating products, so that the file is interpreted correctly.

#### Acceptance Criteria

1. THE Import_Panel SHALL let the Admin choose between Update_Stock_Mode and Create_Products_Mode before validation.
2. THE Import_Panel SHALL validate the Upload_File against the required columns for the selected mode and SHALL report missing required columns before Preview.
3. THE Import_Panel SHALL provide a downloadable Template_File for each mode with the correct headers and an example row.

### Requirement 4: Update Stock Mode

**User Story:** As an Admin, I want to bulk-update inventory by SKU, so that I can correct stock levels across many products quickly.

#### Acceptance Criteria

1. THE Update_Stock_Mode SHALL require a `sku` column and an `inventory` column per Row.
2. THE Update_Stock_Mode SHALL match each Row to a Variant by its `sku`, or to a Product by the product-level `sku` when no variant matches.
3. WHEN a Row matches a Variant, THE Platform SHALL set that Variant's `inventory` to the Row value and SHALL recompute the product-level `inventory` as the sum of its variant inventories (or set it directly WHEN the Product has no variants).
4. THE Update_Stock_Mode SHALL support an optional adjustment semantic (set absolute value by default; optionally add/subtract a delta) indicated by a column or panel setting, with the default being absolute set.
5. IF a Row's `sku` matches no existing Product or Variant, THEN THE Platform SHALL flag that Row as an error and SHALL NOT create a new Product in this mode.
6. IF a Row's `inventory` value is missing, negative, or non-numeric, THEN THE Platform SHALL flag that Row as an error and SHALL NOT apply it.
7. THE Update_Stock_Mode SHALL NOT modify price, title, images, or any non-inventory field.

### Requirement 5: Create Products Mode

**User Story:** As an Admin, I want to create many products from a file, so that I can onboard a new collection without adding each product by hand.

#### Acceptance Criteria

1. THE Create_Products_Mode SHALL require the columns needed to satisfy the `Product` model: at minimum `title`, `category`, `gender`, `price`, `sku`, and `inventory`.
2. THE Create_Products_Mode SHALL accept optional columns including `slug`, `description`, `shortDescription`, `subcategory`, `comparePrice`, `tags`, `featured`, `bestseller`, `newArrival`, and `images`.
3. WHEN `slug` is omitted, THE Platform SHALL generate a slug from the `title` using the existing `slugify` utility.
4. THE Create_Products_Mode SHALL accept image references as URLs or public paths in an `images` column and SHALL store them in the Product's `images` array without requiring a file upload.
5. THE Create_Products_Mode SHALL support defining Variants for a Product, either as multiple Rows grouped by the product `slug`/`sku` or via a structured column, with each Variant carrying its own `size`, `color`, `colorHex`, `inventory`, and `sku`.
6. IF a Row's `gender` is not one of `men`, `women`, `unisex`, or `price`/`inventory` are non-numeric or negative, THEN THE Platform SHALL flag that Row as an error.
7. WHEN a Row's `slug` matches an existing Product, THE Platform SHALL, by default, skip that Row and report it as skipped (duplicate), consistent with the existing seed behaviour, unless the Admin explicitly chooses to update matching products.
8. THE Create_Products_Mode SHALL set derived fields not present in the file to safe defaults (`ratings: 0`, `reviewsCount: 0`, badges default `false`, `createdAt` server timestamp).

### Requirement 6: Validation and Preview Before Commit

**User Story:** As an Admin, I want to see exactly what will change before it happens, so that I do not corrupt live data with a bad file.

#### Acceptance Criteria

1. THE Import_Panel SHALL validate every Row before any write and SHALL classify each Row as applicable, skipped, or error.
2. THE Import_Panel SHALL display a Preview summarising the counts of applicable, skipped, and error Rows, and SHALL list per-Row errors with the row number and reason.
3. THE Import_Panel SHALL require an explicit Admin confirmation (Commit) after Preview before writing anything to Firestore.
4. WHEN the file contains at least one error Row, THE Import_Panel SHALL still allow the Admin to Commit the valid Rows while skipping error Rows, and SHALL make this behaviour explicit.
5. THE Import_Panel SHALL validate each Row against a schema (using the project's existing Zod validation approach) so that field rules match single-product creation where applicable.

### Requirement 7: Commit and Persistence

**User Story:** As an Admin, I want the confirmed changes written reliably, so that stock and products reflect my file.

#### Acceptance Criteria

1. THE Import_Panel SHALL write applicable Rows to the Firestore `products` collection using the existing client SDK, reusing Product_Service and Inventory_Service logic where practical.
2. THE Platform SHALL write in batches so that large files commit efficiently and within Firestore batch limits.
3. WHEN a batch write partially fails, THE Import_Panel SHALL report which Rows succeeded and which failed, and SHALL not silently lose failures.
4. THE Update_Stock_Mode Commit SHALL preserve all non-inventory fields of each affected Product.
5. WHEN Commit completes, THE Import_Panel SHALL display a result summary (created, updated, skipped, failed counts) and SHALL allow downloading an Error_Report for any failures.

### Requirement 8: Feedback, Idempotency, and Safety

**User Story:** As an Admin, I want the upload to be safe to retry, so that mistakes are recoverable and re-running does not double-apply.

#### Acceptance Criteria

1. THE Update_Stock_Mode SHALL be idempotent by default (absolute set), such that committing the same file twice yields the same final inventory.
2. THE Create_Products_Mode SHALL skip duplicates by `slug` so that re-running a file does not create duplicate Products.
3. THE Import_Panel SHALL disable the Commit control while a Commit is in progress to prevent double submission.
4. THE Import_Panel SHALL surface progress during a long Commit (for example, rows processed of total).
5. THE Import_Panel SHALL present all errors and results in clear, non-technical language, without exposing stack traces.

### Requirement 9: Non-Functional Requirements

**User Story:** As the Platform owner, I want the feature to fit the existing stack and not degrade the app, so that it is maintainable.

#### Acceptance Criteria

1. THE feature SHALL be implemented within the canonical app (`wefton-copper/wefton-platform`) and SHALL follow its existing patterns (Zustand-free service calls, Zod schemas, Radix UI dialogs, brand styling tokens).
2. THE feature SHALL add only well-maintained parsing dependencies (a CSV parser and an `.xlsx` reader) and SHALL keep them out of the customer-facing bundle where feasible (loaded within the admin route only).
3. THE feature SHALL not alter customer-facing pages or checkout behaviour.
4. THE feature SHALL preserve the existing single-product `ProductFormModal` workflow unchanged.

### Requirement 10: Per-Product Image Upload After Import

**User Story:** As an Admin, I want to upload multiple images directly against each product from the dashboard, so that products created via bulk import (which need not carry image files) can be given real images afterward.

#### Acceptance Criteria

1. THE Products list in the admin dashboard SHALL provide, per Product row, an action to manage that Product's images (a "Manage Images" affordance), in addition to the existing edit action.
2. WHEN the Admin opens the image manager for a Product, THE Platform SHALL display the Product's existing `images` and allow adding more.
3. THE image manager SHALL allow selecting and uploading multiple image files at once (JPEG, PNG, WebP), consistent with the existing `ProductFormModal` upload rules and size limit.
4. THE Platform SHALL upload each selected file to Firebase Storage under the Product's existing path convention (`products/{productId}/{filename}`) and SHALL append the resulting download URLs to the Product's `images` array.
5. THE image manager SHALL let the Admin remove an existing image and SHALL let the Admin designate exactly one image as the primary image (`isPrimary`).
6. THE image manager SHALL let the Admin reorder images, and THE first image (or the one marked primary) SHALL be treated as the Product's main image consistently with how the storefront selects the primary image today.
7. WHEN the Admin saves, THE Platform SHALL persist the updated `images` array to the Product document via the existing `updateProduct` service.
8. IF an image upload fails, THEN THE Platform SHALL report which files failed without discarding successfully uploaded images, and SHALL allow retry.
9. THE image manager SHALL show upload progress and SHALL disable save while an upload is in progress.
10. THE Products list SHALL indicate Products that currently have no images, so that Admins can quickly find bulk-imported Products needing images.
