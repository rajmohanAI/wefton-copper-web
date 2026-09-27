// ============================================================
// Wefton Copper — Bulk Import Row Schemas (Zod)
// ============================================================
// Row-level validation for bulk CSV/XLSX imports. Field rules mirror
// `productFormSchema` so bulk-created products stay consistent with
// products created through the single-product form.

import { z } from 'zod';

// ── Coercion helpers ──────────────────────────────────────────
// CSV/XLSX values arrive as strings; coerce and normalise here.

const boolFromString = z
  .union([z.string(), z.boolean()])
  .transform((v) => {
    if (typeof v === 'boolean') return v;
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'y';
  });

const intNonNeg = (label: string) =>
  z.coerce
    .number({ message: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(0, `${label} must be 0 or more`);

const positiveNumber = (label: string) =>
  z.coerce.number({ message: `${label} must be a number` }).positive(`${label} must be positive`);

// Split a pipe- or comma-separated list into a trimmed string array.
export function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── Update Stock row ──────────────────────────────────────────

export const stockRowSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  inventory: intNonNeg('Inventory'),
  mode: z
    .union([z.string(), z.undefined()])
    .transform((v) => (v ? v.trim().toLowerCase() : 'set'))
    .pipe(z.enum(['set', 'delta'], { message: "Mode must be 'set' or 'delta'" })),
});

export type StockRowInput = z.input<typeof stockRowSchema>;
export type StockRow = z.infer<typeof stockRowSchema>;

// ── Create Product row ────────────────────────────────────────
// Optional variant* fields are validated separately when present so a
// product row without variant columns still passes.

export const productRowSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe (lowercase letters, numbers, hyphens)')
    .optional()
    .or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  gender: z.enum(['men', 'women', 'unisex'], { message: 'Gender must be men, women, or unisex' }),
  price: positiveNumber('Price'),
  comparePrice: z
    .union([z.string(), z.number(), z.undefined()])
    .transform((v, ctx) => {
      if (v === undefined || (typeof v === 'string' && v.trim() === '')) return undefined;
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isNaN(n) || n <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Compare price must be a positive number' });
        return z.NEVER;
      }
      return n;
    }),
  sku: z.string().min(1, 'SKU is required'),
  inventory: intNonNeg('Inventory'),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.string().optional(),
  featured: boolFromString.optional(),
  bestseller: boolFromString.optional(),
  newArrival: boolFromString.optional(),
  images: z.string().optional(),
});

export type ProductRowInput = z.input<typeof productRowSchema>;
export type ProductRow = z.infer<typeof productRowSchema>;

// ── Variant fragment (only validated when variant columns present) ─

export const variantRowSchema = z.object({
  size: z.string().optional(),
  color: z.string().optional(),
  colorHex: z.string().optional(),
  inventory: intNonNeg('Variant inventory'),
  sku: z.string().optional(),
});

export type VariantRow = z.infer<typeof variantRowSchema>;

/**
 * Flattens Zod issues into a single human-readable message per row.
 */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => {
      const field = i.path.join('.');
      return field ? `${field}: ${i.message}` : i.message;
    })
    .join('; ');
}
