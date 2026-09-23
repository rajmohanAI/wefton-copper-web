// ============================================================
// Wefton Copper — Bulk Import Templates & Column Definitions
// ============================================================
// Canonical column headers for each import mode plus helpers to
// download a sample CSV template. Headers are matched case-insensitively
// and trimmed at parse time (see bulkImportService.normaliseRow).

export type ImportMode = 'update-stock' | 'create-products';

// ── Update Stock mode ─────────────────────────────────────────
// One row per SKU. Matches a variant SKU first, else the product SKU.
export const STOCK_COLUMNS = {
  required: ['sku', 'inventory'] as const,
  optional: ['mode'] as const, // 'set' (default) | 'delta'
};

// ── Create Products mode ──────────────────────────────────────
// One row per product. Variants may be supplied as additional rows
// sharing the same `slug` (or `sku`) using the variant* columns.
export const PRODUCT_COLUMNS = {
  required: ['title', 'category', 'gender', 'price', 'sku', 'inventory'] as const,
  optional: [
    'slug',
    'description',
    'shortdescription',
    'subcategory',
    'compareprice',
    'tags',
    'featured',
    'bestseller',
    'newarrival',
    'images',
    'variantsize',
    'variantcolor',
    'variantcolorhex',
    'variantinventory',
    'variantsku',
  ] as const,
};

export function requiredColumns(mode: ImportMode): readonly string[] {
  return mode === 'update-stock' ? STOCK_COLUMNS.required : PRODUCT_COLUMNS.required;
}

export function allColumns(mode: ImportMode): string[] {
  return mode === 'update-stock'
    ? [...STOCK_COLUMNS.required, ...STOCK_COLUMNS.optional]
    : [...PRODUCT_COLUMNS.required, ...PRODUCT_COLUMNS.optional];
}

/**
 * Builds a sample CSV string (headers + one example row) for the given mode.
 */
export function buildTemplateCsv(mode: ImportMode): string {
  if (mode === 'update-stock') {
    const headers = ['sku', 'inventory', 'mode'];
    const example = ['WC-PT-001-M-NV', '25', 'set'];
    return `${headers.join(',')}\n${example.join(',')}\n`;
  }

  const headers = [
    'title',
    'slug',
    'category',
    'gender',
    'price',
    'compareprice',
    'sku',
    'inventory',
    'shortdescription',
    'description',
    'tags',
    'featured',
    'bestseller',
    'newarrival',
    'images',
    'variantsize',
    'variantcolor',
    'variantcolorhex',
    'variantinventory',
    'variantsku',
  ];
  const example = [
    'Premium Navy Tee',
    'premium-navy-tee',
    'premium-tee',
    'men',
    '1299',
    '1599',
    'WC-PT-001',
    '45',
    'Signature cotton tee in deep navy',
    'Full length product description goes here.',
    'premium|navy|tee',
    'true',
    'false',
    'false',
    'https://example.com/img1.jpg|https://example.com/img2.jpg',
    'M',
    'Navy',
    '#1B2838',
    '15',
    'WC-PT-001-M-NV',
  ];
  // Wrap fields containing commas in quotes for CSV safety.
  const esc = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  return `${headers.join(',')}\n${example.map(esc).join(',')}\n`;
}

/**
 * Triggers a browser download of the template CSV for the given mode.
 */
export function downloadTemplate(mode: ImportMode): void {
  const csv = buildTemplateCsv(mode);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = mode === 'update-stock' ? 'wefton-stock-template.csv' : 'wefton-products-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
