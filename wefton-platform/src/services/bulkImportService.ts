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
  splitList,
  formatIssues,
} from '@/lib/bulkImportSchemas';
import {
  CATALOG_SIZES,
  autoShortDescription,
  buildVariantSku,
  findColor,
  normalizeSize,
  sizeCode,
  skuBase,
  type CatalogColor,
} from '@/lib/productCodes';
import { reserveProductCodes } from '@/services/catalogAdminService';
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
  /** variantId → colour number, for building the variant SKUs on commit. */
  colorCodes: Record<string, string>;
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

function toImages(imagesCol: string | undefined, title: string): ProductImage[] {
  return splitList(imagesCol).map((url, i) => ({ url, alt: title, isPrimary: i === 0 }));
}

/**
 * One CSV row per variant. Rows sharing a slug (or, without a slug, the
 * same title + gender) fold into one product. Colours must be in the
 * colour list and sizes in the size table so SKUs can be generated.
 */
export async function validateProductRows(
  rows: ParsedRow[],
  products: Product[],
  colors: CatalogColor[]
): Promise<ValidationOutcome> {
  const missingColumns = findMissingColumns(rows, 'create-products');
  const results: RowResult[] = [];
  const existingSlugs = new Set(products.map((p) => p.slug));

  interface Draft {
    rows: number[];
    base: Omit<Product, 'productId'>;
    variants: ProductVariant[];
    colorCodes: Map<string, string>; // variantId → colour number
    explicitSlug: boolean;
    failed: boolean;
  }
  const drafts = new Map<string, Draft>();

  if (missingColumns.length === 0) {
    for (const row of rows) {
      const rec = row.data;
      // Headers arrive lowercased; map them onto the schema's field names.
      const parsed = productRowSchema.safeParse({
        title: rec.title,
        slug: rec.slug,
        category: rec.category,
        gender: rec.gender?.toLowerCase(),
        price: rec.price,
        comparePrice: rec.compareprice ?? '',
        inventory: rec.inventory,
        color: rec.color ?? rec.colour,
        size: rec.size,
        description: rec.description,
        shortDescription: rec.shortdescription,
        subcategory: rec.subcategory,
        tags: rec.tags,
        featured: rec.featured || undefined,
        bestseller: rec.bestseller || undefined,
        newArrival: rec.newarrival || undefined,
        images: rec.images,
      });
      const label = [rec.title, rec.color, rec.size].filter(Boolean).join(' / ');
      if (!parsed.success) {
        results.push({ rowNumber: row.rowNumber, status: 'error', message: formatIssues(parsed.error), label });
        continue;
      }
      const p = parsed.data;
      const explicitSlug = !!p.slug;
      const key = explicitSlug ? `slug:${p.slug}` : `title:${p.title.trim().toLowerCase()}|${p.gender}`;

      // Variant columns: both colour and size, or neither.
      const colorName = (p.color || '').trim();
      const size = normalizeSize(p.size);
      let variant: ProductVariant | null = null;
      let colorCode = '';
      if (colorName || size) {
        const master = findColor(colors, colorName);
        if (!colorName || !size) {
          results.push({ rowNumber: row.rowNumber, status: 'error', message: 'Give both a colour and a size, or leave both empty.', label });
          continue;
        }
        if (!master) {
          results.push({ rowNumber: row.rowNumber, status: 'error', message: `Colour "${colorName}" is not in the colour list. Add it from the product form first.`, label });
          continue;
        }
        if (!sizeCode(size)) {
          results.push({ rowNumber: row.rowNumber, status: 'error', message: `Size "${p.size}" is not in the size table (${CATALOG_SIZES.join(', ')}).`, label });
          continue;
        }
        colorCode = master.code;
        variant = {
          variantId: crypto.randomUUID(),
          color: master.name,
          colorHex: master.hex,
          size,
          inventory: p.inventory,
        };
      }

      let draft = drafts.get(key);
      if (!draft) {
        draft = {
          rows: [],
          explicitSlug,
          failed: false,
          variants: [],
          colorCodes: new Map(),
          base: {
            title: p.title,
            slug: explicitSlug ? p.slug! : slugify(p.title),
            description: p.description || p.shortDescription || p.title,
            shortDescription: p.shortDescription || autoShortDescription(p.description || p.title),
            category: p.category,
            subcategory: p.subcategory || undefined,
            gender: p.gender,
            tags: splitList(p.tags),
            price: p.price,
            comparePrice: p.comparePrice,
            inventory: p.inventory,
            sku: '',
            images: toImages(p.images, p.title),
            variants: [],
            ratings: 0,
            reviewsCount: 0,
            featured: p.featured ?? false,
            bestseller: p.bestseller ?? false,
            newArrival: p.newArrival ?? false,
            createdAt: new Date().toISOString(),
          } as Omit<Product, 'productId'>,
        };
        drafts.set(key, draft);
      } else if (draft.base.gender !== p.gender) {
        results.push({ rowNumber: row.rowNumber, status: 'error', message: `Slug "${p.slug}" is used for more than one gender.`, label });
        continue;
      }

      if (variant) {
        const dup = draft.variants.some((v) => v.color === variant!.color && v.size === variant!.size);
        if (dup) {
          results.push({ rowNumber: row.rowNumber, status: 'error', message: `${variant.color} / ${variant.size} appears twice for this product.`, label });
          continue;
        }
        draft.variants.push(variant);
        draft.colorCodes.set(variant.variantId, colorCode);
      }
      draft.rows.push(row.rowNumber);
      results.push({ rowNumber: row.rowNumber, status: 'applicable', label });
    }
  }

  // Same title for men and women without explicit slugs: add the gender
  // to each slug so they don't collide.
  const slugCount = new Map<string, number>();
  for (const d of drafts.values()) {
    if (!d.explicitSlug) slugCount.set(d.base.slug, (slugCount.get(d.base.slug) ?? 0) + 1);
  }
  for (const d of drafts.values()) {
    if (!d.explicitSlug && (slugCount.get(d.base.slug) ?? 0) > 1) d.base.slug = `${d.base.slug}-${d.base.gender}`;
  }

  const createPlan: CreateCommitItem[] = [];
  const planSlugs = new Set<string>();
  for (const draft of drafts.values()) {
    const slug = draft.base.slug;
    if (existingSlugs.has(slug) || planSlugs.has(slug)) {
      for (const n of draft.rows) {
        const r = results.find((x) => x.rowNumber === n && x.status === 'applicable');
        if (r) {
          r.status = 'skipped';
          r.message = `A product with slug "${slug}" already exists.`;
        }
      }
      continue;
    }
    planSlugs.add(slug);
    if (draft.variants.length > 0) {
      draft.base.variants = draft.variants;
      draft.base.inventory = sumVariantInventory(draft.variants);
    }
    createPlan.push({ data: draft.base, colorCodes: Object.fromEntries(draft.colorCodes) });
  }

  return summarise('create-products', results, [], createPlan, missingColumns);
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

// Firestore rejects undefined field values.
function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export async function commit(
  outcome: ValidationOutcome,
  onProgress?: (done: number, total: number) => void,
  reserveCodes: (gender: Product['gender'], count: number) => Promise<string[]> = reserveProductCodes
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

    // Reserve Product IDs per gender up front, then fill in the SKUs.
    const codes = new Map<CreateCommitItem, string>();
    for (const gender of ['men', 'women', 'unisex'] as const) {
      const group = items.filter((i) => i.data.gender === gender);
      if (group.length === 0) continue;
      const reserved = await reserveCodes(gender, group.length);
      group.forEach((item, i) => codes.set(item, reserved[i]));
    }

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const chunk = items.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const code = codes.get(item)!;
        const ref = doc(collection(db, PRODUCTS_COL));
        batch.set(ref, {
          ...stripUndefined(item.data),
          productCode: code,
          sku: skuBase(code) ?? '',
          variants: item.data.variants.map((v) => ({
            ...v,
            sku: buildVariantSku(code, item.colorCodes[v.variantId], v.size) ?? '',
          })),
          createdAt: serverTimestamp(),
        });
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
