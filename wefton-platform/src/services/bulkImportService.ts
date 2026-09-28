// ============================================================
// Wefton Copper — Bulk Import Service (parse / validate / commit)
// ============================================================
// Client-side CSV & XLSX import for products and inventory. Parsers are
// dynamically imported so they stay out of the customer bundle and only
// load inside the admin route when an admin actually imports a file.

import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { slugify } from '@/lib/utils';
import type { Product, ProductVariant, ProductImage } from '@/types';
import {
  productRowSchema,
  stockRowSchema,
  variantRowSchema,
  splitList,
  formatIssues,
} from '@/lib/bulkImportSchemas';
import { requiredColumns, type ImportMode } from '@/lib/bulkImportTemplates';

const PRODUCTS_COL = 'products';
const MAX_ROWS = 5000;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const BATCH_SIZE = 400; // under Firestore's 500-op hard limit

// ── Types ─────────────────────────────────────────────────────

export interface ParsedRow {
  rowNumber: number; // 1-based data row number (excludes header)
  data: Record<string, string>; // normalised (lowercased, trimmed) keys
}

export type RowStatus = 'applicable' | 'skipped' | 'error';

export interface RowResult {
  rowNumber: number;
  status: RowStatus;
  message?: string;
  label?: string; // human-friendly identity (sku / title)
}

export interface StockCommitItem {
  productId: string;
  newVariants: ProductVariant[];
  newInventory: number;
}

export interface CreateCommitItem {
  data: Omit<Product, 'productId'>;
}

export interface ValidationOutcome {
  mode: ImportMode;
  results: RowResult[];
  applicable: number;
  skipped: number;
  errors: number;
  stockPlan: StockCommitItem[];
  createPlan: CreateCommitItem[];
  missingColumns: string[];
}

export interface CommitResult {
  created: number;
  updated: number;
  failed: number;
  failures: { label: string; message: string }[];
}

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase is not configured.');
  return db;
}

// ── Parsing ───────────────────────────────────────────────────

/** Lowercase + trim a header/key so column matching is order- and case-independent. */
function normaliseKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '');
}

function normaliseRecord(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k == null) continue;
    const key = normaliseKey(k);
    if (!key) continue;
    out[key] = v == null ? '' : String(v).trim();
  }
  return out;
}

function isRowEmpty(rec: Record<string, string>): boolean {
  return Object.values(rec).every((v) => v === '');
}

/**
 * Parses a .csv or .xlsx file into a common normalised row structure.
 * Throws a user-facing Error on unsupported/corrupt/empty files.
 */
export async function parseFile(file: File): Promise<ParsedRow[]> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File is too large. Please keep uploads under 10 MB.');
  }

  const name = file.name.toLowerCase();
  let records: Record<string, unknown>[];

  if (name.endsWith('.csv')) {
    const Papa = (await import('papaparse')).default;
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h, // keep raw; we normalise ourselves
    });
    if (parsed.errors?.length) {
      const first = parsed.errors[0];
      throw new Error(`Could not parse CSV: ${first.message} (row ${first.row ?? '?'}).`);
    }
    records = parsed.data;
  } else if (name.endsWith('.xlsx')) {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error('The Excel file has no sheets.');
    const sheet = wb.Sheets[sheetName];
    records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  } else {
    throw new Error('Unsupported file type. Please upload a .csv or .xlsx file.');
  }

  const rows: ParsedRow[] = [];
  records.forEach((raw, idx) => {
    const data = normaliseRecord(raw);
    if (isRowEmpty(data)) return;
    rows.push({ rowNumber: idx + 1, data });
  });

  if (rows.length === 0) throw new Error('The file has no data rows.');
  if (rows.length > MAX_ROWS) {
    throw new Error(`Too many rows (${rows.length}). The limit is ${MAX_ROWS} per file.`);
  }
  return rows;
}

/** Returns required columns that are absent from the parsed header set. */
export function findMissingColumns(rows: ParsedRow[], mode: ImportMode): string[] {
  if (rows.length === 0) return [];
  const present = new Set(Object.keys(rows[0].data));
  return requiredColumns(mode).filter((c) => !present.has(c));
}

// ── Existing products snapshot ────────────────────────────────

export async function loadExistingProducts(): Promise<Product[]> {
  const db = requireDb();
  const snap = await getDocs(query(collection(db, PRODUCTS_COL), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ productId: d.id, ...(d.data() as Omit<Product, 'productId'>) }));
}

// ── Validation: Update Stock ──────────────────────────────────

interface StockTarget {
  product: Product;
  variantIndex: number | null; // null → product-level match
}

function buildSkuIndex(products: Product[]) {
  const variantSku = new Map<string, { product: Product; variantIndex: number }>();
  const productSku = new Map<string, Product>();
  for (const p of products) {
    if (p.sku) productSku.set(p.sku.trim().toLowerCase(), p);
    (p.variants || []).forEach((v, i) => {
      if (v.sku) variantSku.set(v.sku.trim().toLowerCase(), { product: p, variantIndex: i });
    });
  }
  return { variantSku, productSku };
}

function sumVariantInventory(variants: ProductVariant[]): number {
  return variants.reduce((s, v) => s + (Number(v.inventory) || 0), 0);
}

export async function validateStockRows(
  rows: ParsedRow[],
  products: Product[]
): Promise<ValidationOutcome> {
  const missingColumns = findMissingColumns(rows, 'update-stock');
  const results: RowResult[] = [];
  // Accumulate edits per product so multiple rows for one product merge.
  const edits = new Map<string, { product: Product; variants: ProductVariant[] }>();
  const { variantSku, productSku } = buildSkuIndex(products);

  if (missingColumns.length === 0) {
    for (const row of rows) {
      const parsed = stockRowSchema.safeParse({
        sku: row.data.sku,
        inventory: row.data.inventory,
        mode: row.data.mode,
      });
      if (!parsed.success) {
        results.push({ rowNumber: row.rowNumber, status: 'error', message: formatIssues(parsed.error), label: row.data.sku });
        continue;
      }
      const { sku, inventory, mode } = parsed.data;
      const key = sku.trim().toLowerCase();

      let target: StockTarget | null = null;
      const vHit = variantSku.get(key);
      if (vHit) target = { product: vHit.product, variantIndex: vHit.variantIndex };
      else if (productSku.has(key)) target = { product: productSku.get(key)!, variantIndex: null };

      if (!target) {
        results.push({ rowNumber: row.rowNumber, status: 'error', message: `No product or variant found with SKU "${sku}".`, label: sku });
        continue;
      }

      // Work off an accumulating copy so multiple rows compose.
      const acc = edits.get(target.product.productId) ?? {
        product: target.product,
        variants: (target.product.variants || []).map((v) => ({ ...v })),
      };

      if (target.variantIndex === null) {
        // Product-level match: set/delta the product inventory directly.
        const current = acc.product.inventory ?? 0;
        const next = mode === 'delta' ? current + inventory : inventory;
        acc.product = { ...acc.product, inventory: Math.max(0, next) };
      } else {
        const v = acc.variants[target.variantIndex];
        const current = v.inventory ?? 0;
        const next = mode === 'delta' ? current + inventory : inventory;
        acc.variants[target.variantIndex] = { ...v, inventory: Math.max(0, next) };
      }
      edits.set(target.product.productId, acc);
      results.push({ rowNumber: row.rowNumber, status: 'applicable', label: sku });
    }
  }

  const stockPlan: StockCommitItem[] = [];
  for (const [productId, acc] of edits) {
    const hasVariants = acc.variants.length > 0;
    const newInventory = hasVariants ? sumVariantInventory(acc.variants) : acc.product.inventory ?? 0;
    stockPlan.push({ productId, newVariants: acc.variants, newInventory });
  }

  return summarise('update-stock', results, stockPlan, [], missingColumns);
}

// ── Validation: Create Products ───────────────────────────────

function hasVariantColumns(rec: Record<string, string>): boolean {
  return (
    !!rec.variantsize || !!rec.variantcolor || !!rec.variantsku || rec.variantinventory !== undefined && rec.variantinventory !== ''
  );
}

function toImages(imagesCol: string | undefined, title: string): ProductImage[] {
  return splitList(imagesCol).map((url, i) => ({ url, alt: title, isPrimary: i === 0 }));
}

export async function validateProductRows(
  rows: ParsedRow[],
  products: Product[]
): Promise<ValidationOutcome> {
  const missingColumns = findMissingColumns(rows, 'create-products');
  const results: RowResult[] = [];
  const existingSlugs = new Set(products.map((p) => p.slug));

  // Group rows by resolved slug so variant rows fold into one product.
  interface Draft {
    firstRow: number;
    base: Omit<Product, 'productId'> | null;
    variants: ProductVariant[];
    error?: string;
    label: string;
  }
  const drafts = new Map<string, Draft>();
  const order: string[] = [];

  if (missingColumns.length === 0) {
    for (const row of rows) {
      const rec = row.data;
      const parsed = productRowSchema.safeParse(rec);
      if (!parsed.success) {
        results.push({ rowNumber: row.rowNumber, status: 'error', message: formatIssues(parsed.error), label: rec.title || rec.sku });
        continue;
      }
      const p = parsed.data;
      const slug = (p.slug && p.slug !== '' ? p.slug : slugify(p.title)).trim();

      let draft = drafts.get(slug);
      if (!draft) {
        draft = { firstRow: row.rowNumber, base: null, variants: [], label: p.title };
        drafts.set(slug, draft);
        order.push(slug);
      }

      // The first row for a slug establishes the product base fields.
      if (!draft.base) {
        draft.base = {
          title: p.title,
          slug,
          description: p.description || p.shortDescription || p.title,
          shortDescription: p.shortDescription || '',
          category: p.category,
          subcategory: p.subcategory || undefined,
          gender: p.gender,
          tags: splitList(p.tags),
          price: p.price,
          comparePrice: p.comparePrice,
          inventory: p.inventory,
          sku: p.sku,
          images: toImages(p.images, p.title),
          variants: [],
          ratings: 0,
          reviewsCount: 0,
          featured: p.featured ?? false,
          bestseller: p.bestseller ?? false,
          newArrival: p.newArrival ?? false,
          createdAt: new Date().toISOString(),
        } as Omit<Product, 'productId'>;
        results.push({ rowNumber: row.rowNumber, status: 'applicable', label: p.title });
      } else {
        // Subsequent row for same slug: treated as an additional variant carrier.
        results.push({ rowNumber: row.rowNumber, status: 'applicable', label: `${p.title} (variant)` });
      }

      // Collect a variant if variant columns are present on this row.
      if (hasVariantColumns(rec)) {
        const vParsed = variantRowSchema.safeParse({
          size: rec.variantsize,
          color: rec.variantcolor,
          colorHex: rec.variantcolorhex,
          inventory: rec.variantinventory || '0',
          sku: rec.variantsku,
        });
        if (vParsed.success) {
          draft.variants.push({
            variantId: crypto.randomUUID(),
            size: vParsed.data.size || undefined,
            color: vParsed.data.color || undefined,
            colorHex: vParsed.data.colorHex || undefined,
            inventory: vParsed.data.inventory,
            sku: vParsed.data.sku || undefined,
          });
        } else {
          // Downgrade the row to error but keep the product base.
          results.push({ rowNumber: row.rowNumber, status: 'error', message: `Variant: ${formatIssues(vParsed.error)}`, label: p.title });
        }
      }
    }
  }

  const createPlan: CreateCommitItem[] = [];
  for (const slug of order) {
    const draft = drafts.get(slug)!;
    if (!draft.base) continue;

    if (existingSlugs.has(slug)) {
      results.push({ rowNumber: draft.firstRow, status: 'skipped', message: `A product with slug "${slug}" already exists.`, label: draft.label });
      // Remove the earlier "applicable" marks for this draft's rows.
      demoteApplicableToSkipped(results, draft.firstRow, slug);
      continue;
    }

    const base = draft.base;
    if (draft.variants.length > 0) {
      base.variants = draft.variants;
      base.inventory = sumVariantInventory(draft.variants);
    }
    createPlan.push({ data: base });
  }

  return summarise('create-products', results, [], createPlan, missingColumns);
}

// When a whole product is skipped as a duplicate, ensure its rows are not
// double-counted as applicable in the summary.
function demoteApplicableToSkipped(results: RowResult[], firstRow: number, _slug: string) {
  const r = results.find((x) => x.rowNumber === firstRow && x.status === 'applicable');
  if (r) r.status = 'skipped';
}

// ── Summary ───────────────────────────────────────────────────

function summarise(
  mode: ImportMode,
  results: RowResult[],
  stockPlan: StockCommitItem[],
  createPlan: CreateCommitItem[],
  missingColumns: string[]
): ValidationOutcome {
  const applicable = results.filter((r) => r.status === 'applicable').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errors = results.filter((r) => r.status === 'error').length;
  return { mode, results, applicable, skipped, errors, stockPlan, createPlan, missingColumns };
}

// ── Commit ────────────────────────────────────────────────────

export async function commit(
  outcome: ValidationOutcome,
  onProgress?: (done: number, total: number) => void
): Promise<CommitResult> {
  const db = requireDb();
  const result: CommitResult = { created: 0, updated: 0, failed: 0, failures: [] };

  if (outcome.mode === 'update-stock') {
    const items = outcome.stockPlan;
    const total = items.length;
    let done = 0;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const chunk = items.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const item of chunk) {
        batch.update(doc(db, PRODUCTS_COL, item.productId), {
          variants: item.newVariants,
          inventory: item.newInventory,
          updatedAt: serverTimestamp(),
        });
      }
      try {
        await batch.commit();
        result.updated += chunk.length;
      } catch (e) {
        result.failed += chunk.length;
        const msg = e instanceof Error ? e.message : 'Unknown error';
        for (const item of chunk) result.failures.push({ label: item.productId, message: msg });
      }
      done += chunk.length;
      onProgress?.(done, total);
    }
  } else {
    const items = outcome.createPlan;
    const total = items.length;
    let done = 0;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const chunk = items.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const ref = doc(collection(db, PRODUCTS_COL));
        batch.set(ref, { ...item.data, createdAt: serverTimestamp() });
      }
      try {
        await batch.commit();
        result.created += chunk.length;
      } catch (e) {
        result.failed += chunk.length;
        const msg = e instanceof Error ? e.message : 'Unknown error';
        for (const item of chunk) result.failures.push({ label: item.data.title, message: msg });
      }
      done += chunk.length;
      onProgress?.(done, total);
    }
  }

  return result;
}

/** Builds a CSV error report string from a validation outcome + commit result. */
export function buildErrorReport(outcome: ValidationOutcome, commitResult?: CommitResult): string {
  const lines: string[] = ['row,status,label,message'];
  const esc = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  for (const r of outcome.results) {
    if (r.status === 'applicable') continue;
    lines.push([String(r.rowNumber), r.status, esc(r.label || ''), esc(r.message || '')].join(','));
  }
  if (commitResult) {
    for (const f of commitResult.failures) {
      lines.push(['', 'commit-failed', esc(f.label), esc(f.message)].join(','));
    }
  }
  return lines.join('\n') + '\n';
}
