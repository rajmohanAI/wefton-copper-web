// ============================================================
// Wefton Copper — Product ID & SKU scheme (pure logic)
// ============================================================
// Product ID: WCP + gender letter + 3-digit running number per gender,
//   e.g. WCPM001, WCPW001, WCPU001.
// Variant SKU: WC + P + 2-digit model no + gender + colour no + size no,
//   e.g. Olive Green / Men / M on WCPM001 → WCP01M0103.
// The 6-digit serial on a barcode label (WCP01M0103000001) is per piece
// and is printed from the Serial Generator, not stored on the product.

export type Gender = 'men' | 'women' | 'unisex';
export type GenderLetter = 'M' | 'W' | 'U';

export const GENDER_LETTER: Record<Gender, GenderLetter> = {
  men: 'M',
  women: 'W',
  unisex: 'U',
};

/** Size → 2-digit size number. Order here is the display order. */
export const SIZE_CODES: Record<string, string> = {
  XS: '01',
  S: '02',
  M: '03',
  L: '04',
  XL: '05',
  '2XL': '06',
  '3XL': '07',
  '4XL': '08',
  '5XL': '09',
  '6XL': '10',
};

export const CATALOG_SIZES = Object.keys(SIZE_CODES);

export interface CatalogColor {
  name: string;
  code: string; // 2-digit colour number, e.g. "01"
  hex: string;
}

export const DEFAULT_COLORS: CatalogColor[] = [
  { name: 'Olive Green', code: '01', hex: '#556B2F' },
  { name: 'Deep Blue', code: '02', hex: '#1F3A68' },
];

export const MAX_PRODUCT_NUMBER = 999;
/** SKUs and serials carry a 2-digit model no, so only P01–P99 fit. */
export const MAX_SKU_MODEL_NUMBER = 99;

/** 2-digit model no as printed in SKUs and serials, e.g. 1 → "P01". */
export function formatModelId(n: number): string {
  return `P${String(n).padStart(2, '0')}`;
}

/** "XXL" and lowercase spellings map onto the size table; unknown sizes pass through. */
export function normalizeSize(size: string | undefined | null): string {
  const s = (size || '').trim().toUpperCase().replace(/\s+/g, '');
  if (s === 'XXL') return '2XL';
  if (s === 'XXXL') return '3XL';
  return s;
}

export function sizeCode(size: string | undefined | null): string | null {
  return SIZE_CODES[normalizeSize(size)] ?? null;
}

export function findColor(colors: CatalogColor[], name: string | undefined | null): CatalogColor | null {
  const key = (name || '').trim().toLowerCase();
  if (!key) return null;
  return colors.find((c) => c.name.trim().toLowerCase() === key) ?? null;
}

/** Next unused 2-digit colour number. */
export function nextColorCode(colors: CatalogColor[]): string {
  const max = colors.reduce((m, c) => Math.max(m, parseInt(c.code, 10) || 0), 0);
  return String(max + 1).padStart(2, '0');
}

export function formatProductCode(gender: Gender, n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > MAX_PRODUCT_NUMBER) {
    throw new Error(`Product number ${n} is out of range (1–${MAX_PRODUCT_NUMBER})`);
  }
  return `WCP${GENDER_LETTER[gender]}${String(n).padStart(3, '0')}`;
}

export function parseProductCode(code: string | undefined | null): { letter: GenderLetter; number: number } | null {
  const m = /^WCP([MWU])(\d{3})$/.exec((code || '').trim().toUpperCase());
  if (!m) return null;
  return { letter: m[1] as GenderLetter, number: parseInt(m[2], 10) };
}

/** Product-level SKU (no colour/size): WCPM001 → WCP01M. */
export function skuBase(productCode: string): string | null {
  const p = parseProductCode(productCode);
  if (!p || p.number > MAX_SKU_MODEL_NUMBER) return null;
  return `WC${formatModelId(p.number)}${p.letter}`;
}

/** Variant SKU, or null when the product code, colour or size is unknown. */
export function buildVariantSku(
  productCode: string,
  colorCode: string | null | undefined,
  size: string | undefined | null
): string | null {
  const base = skuBase(productCode);
  const sCode = sizeCode(size);
  if (!base || !colorCode || !sCode) return null;
  return `${base}${colorCode}${sCode}`;
}

/**
 * Short description derived from the full description: the first sentence,
 * or the first ~160 characters cut at a word boundary.
 */
export function autoShortDescription(description: string, max = 160): string {
  const text = description.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const sentence = /^(.+?[.!?])(\s|$)/.exec(text)?.[1];
  if (sentence && sentence.length <= max) return sentence;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\s]+$/, '')}…`;
}
