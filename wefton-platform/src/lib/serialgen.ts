// ============================================================
// Wefton Copper — Serial / Barcode Generation (pure logic)
// ============================================================
// Builds the list of serial strings from prefix/suffix/start/end/increment
// and validates the input. No I/O here so it is trivially unit-testable and
// safe to import from both server and (for preview) client code.

import {
  GENDER_LETTER,
  MAX_SKU_MODEL_NUMBER,
  findColor,
  formatModelId,
  normalizeSize,
  sizeCode,
  type CatalogColor,
  type GenderLetter,
} from '@/lib/productCodes';

export interface SerialConfig {
  prefix: string;
  suffix: string;
  start: number;
  end: number;
  increment: number;
  /** Minimum digits for the number part (zero-padded), e.g. 6 → 000001. */
  padWidth?: number;
}

export interface SerialValidation {
  valid: boolean;
  error?: string;
  count?: number; // number of serials that would be generated
}

// Guardrail: cap how many barcodes one request can produce so a stray
// end value (e.g. 1..1000000) can't exhaust memory / lock the process.
export const MAX_SERIALS = 5000;

/**
 * Validates a serial config and reports how many serials it would yield.
 */
export function validateSerialConfig(cfg: Partial<SerialConfig>): SerialValidation {
  const { prefix = '', suffix = '', start, end, increment } = cfg;

  if (start === undefined || Number.isNaN(start)) return { valid: false, error: 'Start value is required.' };
  if (end === undefined || Number.isNaN(end)) return { valid: false, error: 'End value is required.' };
  if (increment === undefined || Number.isNaN(increment)) return { valid: false, error: 'Increment is required.' };

  if (!Number.isInteger(start) || !Number.isInteger(end) || !Number.isInteger(increment)) {
    return { valid: false, error: 'Start, End, and Increment must be whole numbers.' };
  }
  if (start < 0 || end < 0) return { valid: false, error: 'Start and End must be 0 or greater.' };
  if (increment < 1) return { valid: false, error: 'Increment must be at least 1.' };
  if (end < start) return { valid: false, error: 'End value must be greater than or equal to Start value.' };
  if (cfg.padWidth !== undefined && (!Number.isInteger(cfg.padWidth) || cfg.padWidth < 1 || cfg.padWidth > 12)) {
    return { valid: false, error: 'Serial digits must be between 1 and 12.' };
  }

  // Code128 accepts printable ASCII; reject control chars in affixes.
  // eslint-disable-next-line no-control-regex
  const badAffix = /[\x00-\x1f]/;
  if (badAffix.test(prefix) || badAffix.test(suffix)) {
    return { valid: false, error: 'Prefix/Suffix contain unsupported characters.' };
  }

  const count = Math.floor((end - start) / increment) + 1;
  if (count > MAX_SERIALS) {
    return { valid: false, error: `This would generate ${count} serials, exceeding the limit of ${MAX_SERIALS}. Narrow the range or increase the increment.` };
  }

  return { valid: true, count };
}

/**
 * Builds the list of serial strings.
 * Format: `${prefix}${zeroPaddedNumber}${suffix}`.
 * The number is left-padded with zeros to the width of the End value so all
 * serials align (e.g. end=100 → 001, 010, 100), or to `padWidth` if wider.
 */
export function buildSerials(cfg: SerialConfig): string[] {
  const { prefix, suffix, start, end, increment } = cfg;
  const padWidth = Math.max(String(end).length, cfg.padWidth ?? 0);
  const serials: string[] = [];
  for (let n = start; n <= end; n += increment) {
    const num = String(n).padStart(padWidth, '0');
    serials.push(`${prefix}${num}${suffix}`);
  }
  return serials;
}

/**
 * Builds a timestamped PDF filename for a batch.
 */
export function buildPdfName(cfg: SerialConfig): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tag = `${cfg.prefix || 'serial'}${cfg.start}-${cfg.end}`.replace(/[^A-Za-z0-9._-]/g, '_');
  return `barcodes_${tag}_${stamp}.pdf`;
}

// ============================================================
// Product sticker serials
// ============================================================
// Serial = WC + model id (P01) + gender letter + colour no + size no +
// 6-digit piece no, e.g. WCP01M0103000001. The piece no carries on from
// the last one printed for that variant (see services/serialServer).

export const PIECE_DIGITS = 6;
export const MAX_PIECE_NUMBER = 999_999;
/** Every serial is printed this many times (one row of stickers). */
export const STICKER_COPIES = 3;
/** A4 sheet: one serial (its 3 copies) per row, 8 rows a page. */
export const STICKER_ROWS_PER_PAGE = 8;
export const STICKERS_PER_PAGE = STICKER_COPIES * STICKER_ROWS_PER_PAGE;

export interface SerialModel {
  id: string; // "P01"
  name: string;
}

export const DEFAULT_SERIAL_MODELS: SerialModel[] = [
  { id: 'P01', name: '210 GSM 100% cotton, Crew neck half sleeve regular size Tshirt' },
];

/** One line of a sticker batch: `quantity` new serials for one variant. */
export interface StickerRequest {
  modelId: string;
  gender: GenderLetter;
  colorCode: string;
  size: string;
  quantity: number;
}

/** A request resolved to its serial range and the text printed on its stickers. */
export interface StickerSeries extends StickerRequest {
  prefix: string;
  colorName: string;
  start: number;
  end: number;
}

export const GENDER_LETTERS = Object.values(GENDER_LETTER);

export function isModelId(id: string): boolean {
  const m = /^P(\d{2})$/.exec(id);
  return !!m && Number(m[1]) >= 1 && Number(m[1]) <= MAX_SKU_MODEL_NUMBER;
}

/** Next unused model id after the highest one, e.g. [P01] → "P02". */
export function nextModelId(models: SerialModel[]): string {
  const max = models.reduce((m, x) => Math.max(m, isModelId(x.id) ? Number(x.id.slice(1)) : 0), 0);
  return formatModelId(max + 1);
}

/** Variant part of the serial, e.g. WCP01M0103; null when size is unknown. */
export function serialPrefix(r: Pick<StickerRequest, 'modelId' | 'gender' | 'colorCode' | 'size'>): string | null {
  const s = sizeCode(r.size);
  if (!s || !isModelId(r.modelId) || !/^\d{2}$/.test(r.colorCode)) return null;
  return `WC${r.modelId}${r.gender}${r.colorCode}${s}`;
}

export function formatSerial(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(PIECE_DIGITS, '0')}`;
}

/** Checks one request against the model and colour lists; returns an error or null. */
export function validateStickerRequest(
  r: Partial<StickerRequest>,
  models: SerialModel[],
  colorCodes: string[]
): string | null {
  if (!r.modelId || !models.some((m) => m.id === r.modelId)) return `Unknown product ID "${r.modelId ?? ''}".`;
  if (!r.gender || !GENDER_LETTERS.includes(r.gender)) return `Unknown gender "${r.gender ?? ''}".`;
  if (!r.colorCode || !colorCodes.includes(r.colorCode)) return `Unknown colour "${r.colorCode ?? ''}".`;
  if (!sizeCode(r.size)) return `Unknown size "${r.size ?? ''}".`;
  if (!Number.isInteger(r.quantity) || (r.quantity ?? 0) < 1) return 'Quantity must be a whole number of at least 1.';
  return null;
}

/**
 * Lays requests onto their serial ranges, continuing from `lastPrinted`
 * (prefix → last piece no). Two lines for the same variant run on from
 * each other. Returns the series and the new last numbers.
 */
export function planSeries(
  requests: (StickerRequest & { colorName: string })[],
  lastPrinted: Record<string, number>
): { series: StickerSeries[]; last: Record<string, number> } {
  const last = { ...lastPrinted };
  const series = requests.map((r) => {
    const prefix = serialPrefix(r);
    if (!prefix) throw new Error(`Cannot build a serial for ${r.modelId} ${r.gender} ${r.colorCode} ${r.size}`);
    const start = (last[prefix] ?? 0) + 1;
    const end = start + r.quantity - 1;
    if (end > MAX_PIECE_NUMBER) throw new Error(`${prefix} would pass ${formatSerial(prefix, MAX_PIECE_NUMBER)}`);
    last[prefix] = end;
    return { ...r, size: normalizeSize(r.size), prefix, start, end };
  });
  return { series, last };
}

export function countSerials(series: Pick<StickerSeries, 'quantity'>[]): number {
  return series.reduce((n, s) => n + s.quantity, 0);
}

// ── Excel upload ─────────────────────────────────────────────

export const STICKER_SHEET_HEADERS = ['Product ID', 'Color', 'Gender', 'Size', 'Quantity'] as const;

const GENDER_WORDS: Record<string, GenderLetter> = {
  M: 'M', MEN: 'M', MALE: 'M',
  W: 'W', WOMEN: 'W', FEMALE: 'W',
  U: 'U', UNISEX: 'U',
};

/** Reads a cell whose header matches `name`, ignoring case and spaces. */
function cell(row: Record<string, unknown>, name: string): string {
  const want = name.replace(/\s+/g, '').toLowerCase();
  const key = Object.keys(row).find((k) => k.replace(/\s+/g, '').toLowerCase() === want);
  return key === undefined ? '' : String(row[key] ?? '').trim();
}

/**
 * Turns spreadsheet rows (header → value) into sticker requests. Colour may
 * be a name ("Olive Green") or a colour no ("01"); gender may be Men/Women/
 * Unisex or M/W/U. Row numbers in errors count the header as row 1.
 */
export function parseStickerRows(
  rows: Record<string, unknown>[],
  models: SerialModel[],
  colors: CatalogColor[]
): { requests: (StickerRequest & { colorName: string })[]; errors: string[] } {
  const requests: (StickerRequest & { colorName: string })[] = [];
  const errors: string[] = [];
  rows.forEach((row, i) => {
    const rowNo = i + 2;
    const raw = STICKER_SHEET_HEADERS.map((h) => cell(row, h));
    if (raw.every((v) => !v)) return;
    const [model, colorText, genderText, size, qty] = raw;
    const color = findColor(colors, colorText) ?? colors.find((c) => c.code === colorText.padStart(2, '0')) ?? null;
    const request = {
      modelId: model.toUpperCase(),
      gender: GENDER_WORDS[genderText.toUpperCase()],
      colorCode: color?.code ?? colorText,
      size: normalizeSize(size),
      quantity: Number(qty),
    };
    const error = validateStickerRequest(request, models, colors.map((c) => c.code));
    if (error) errors.push(`Row ${rowNo}: ${error}`);
    else requests.push({ ...request, colorName: color!.name });
  });
  if (!requests.length && !errors.length) errors.push('The sheet has no rows.');
  return { requests, errors };
}
