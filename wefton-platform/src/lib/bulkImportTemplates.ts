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
// One row per variant (colour × size). Rows with the same title and
// gender (or the same slug) become one product. Product ID and SKUs are
// generated on import from the colour list and the size table.
export const PRODUCT_COLUMNS = {
  required: ['title', 'gender', 'category', 'price', 'inventory'] as const,
  optional: [
    'color',
    'size',
    'slug',
    'compareprice',
    'description',
    'shortdescription',
    'subcategory',
    'tags',
    'featured',
    'bestseller',
    'newarrival',
    'images',
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

export const PRODUCT_TEMPLATE_HEADERS = [
  'title',
  'gender',
  'category',
  'color',
  'size',
  'inventory',
  'price',
  'compareprice',
  'slug',
  'description',
  'shortdescription',
  'tags',
  'featured',
  'bestseller',
  'newarrival',
  'images',
] as const;

// Table 1.1 from the product spec: one Crew Neck T-shirt in two colours,
// for men and for women, 20 pieces per variant.
const SAMPLE_VARIANTS: [string, string, string][] = [
  ['men', 'Olive Green', 'M'],
  ['men', 'Olive Green', 'L'],
  ['men', 'Olive Green', 'XL'],
  ['men', 'Deep Blue', 'M'],
  ['men', 'Deep Blue', 'L'],
  ['men', 'Deep Blue', 'XL'],
  ['women', 'Olive Green', 'S'],
  ['women', 'Olive Green', 'M'],
  ['women', 'Olive Green', 'L'],
  ['women', 'Deep Blue', 'S'],
  ['women', 'Deep Blue', 'M'],
  ['women', 'Deep Blue', 'L'],
];

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * Builds a sample CSV string (headers + example rows) for the given mode.
 */
export function buildTemplateCsv(mode: ImportMode): string {
  if (mode === 'update-stock') {
    const headers = ['sku', 'inventory', 'mode'];
    const rows = [
      ['WCP001M0103', '20', 'set'],
      ['WCP001M0104', '5', 'delta'],
    ];
    return [headers, ...rows].map((r) => r.join(',')).join('\n') + '\n';
  }

  const rows = SAMPLE_VARIANTS.map(([gender, color, size]) => {
    const row: Record<(typeof PRODUCT_TEMPLATE_HEADERS)[number], string> = {
      title: 'Crew Neck T-shirt',
      gender,
      category: 'premium-tee',
      color,
      size,
      inventory: '20',
      price: '799',
      compareprice: '999',
      slug: `crew-neck-t-shirt-${gender}`,
      description: 'Premium lightweight cotton crew neck T-shirt. Breathable, soft and made to last.',
      shortdescription: '',
      tags: 'cotton|crew neck|essentials',
      featured: 'false',
      bestseller: 'false',
      newarrival: 'true',
      images: '',
    };
    return PRODUCT_TEMPLATE_HEADERS.map((h) => esc(row[h]));
  });
  return [PRODUCT_TEMPLATE_HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n';
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
  a.download = mode === 'update-stock' ? 'wefton-stock-template.csv' : 'sample-products.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
