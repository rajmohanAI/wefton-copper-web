// ============================================================
// Wefton Copper — Serial / Barcode Generation (pure logic)
// ============================================================
// Builds the list of serial strings from prefix/suffix/start/end/increment
// and validates the input. No I/O here so it is trivially unit-testable and
// safe to import from both server and (for preview) client code.

import {
  GENDER_LETTER,
  MAX_SKU_MODEL_NUMBER,
  SIZE_CODES,
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
/** After those rows, every serial prints once more as a full 4.8 × 8.5 cm tag label. */
export const TAG_LABELS_PER_ROW = 4;
export const TAG_LABEL_ROWS_PER_PAGE = 3;
export const TAG_LABELS_PER_PAGE = TAG_LABELS_PER_ROW * TAG_LABEL_ROWS_PER_PAGE;

/** Stickers one serial uses in the PDF: its product copies plus one tag label. */
export const STICKERS_PER_SERIAL = STICKER_COPIES + 1;

/** Rough A4 page count for a batch; tag labels may start on the last product page. */
export function estimateStickerPages(serials: number): number {
  const tagRows = Math.ceil(serials / TAG_LABELS_PER_ROW);
  return Math.ceil(serials / STICKER_ROWS_PER_PAGE + tagRows / TAG_LABEL_ROWS_PER_PAGE);
}

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
  /** Piece no to start from; left out, it carries on from the last one printed. */
  start?: number;
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

/** A serial read back into its parts. */
export interface ParsedSerial {
  serial: string;
  prefix: string;
  piece: number;
  modelId: string;
  gender: GenderLetter;
  colorCode: string;
  size: string;
}

/**
 * Reads a serial such as WCP01M0103000001 (spaces, dashes and case are
 * ignored). Null when it isn't in that shape or the size code is unknown.
 */
export function parseSerial(input: string): ParsedSerial | null {
  const serial = input.toUpperCase().replace(/[\s-]+/g, '');
  const m = /^WC(P\d{2})([MWU])(\d{2})(\d{2})(\d{6})$/.exec(serial);
  if (!m || !isModelId(m[1])) return null;
  const size = Object.keys(SIZE_CODES).find((k) => SIZE_CODES[k] === m[4]);
  const piece = Number(m[5]);
  if (!size || piece < 1) return null;
  return {
    serial,
    prefix: serial.slice(0, -PIECE_DIGITS),
    piece,
    modelId: m[1],
    gender: m[2] as GenderLetter,
    colorCode: m[3],
    size,
  };
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
  if (r.start !== undefined && (!Number.isInteger(r.start) || r.start < 1 || r.start > MAX_PIECE_NUMBER)) {
    return `Start must be a whole number from 1 to ${MAX_PIECE_NUMBER}.`;
  }
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
    const start = r.start ?? (last[prefix] ?? 0) + 1;
    const end = start + r.quantity - 1;
    if (end > MAX_PIECE_NUMBER) throw new Error(`${prefix} would pass ${formatSerial(prefix, MAX_PIECE_NUMBER)}`);
    last[prefix] = Math.max(last[prefix] ?? 0, end);
    return { ...r, size: normalizeSize(r.size), prefix, start, end };
  });
  return { series, last };
}

// ── Already-printed ranges ───────────────────────────────────

/** A run of piece nos already generated for one variant (s to e, inclusive). */
export interface PrintedRange {
  s: number;
  e: number;
}

/** A batch line whose serials were already generated. */
export interface SerialConflict {
  line: number; // index into the request list
  prefix: string;
  start: number;
  end: number;
  overlapStart: number;
  overlapEnd: number;
  /** First piece no free after everything printed so far for the variant. */
  nextStart: number;
}

/** Sorts ranges and joins the ones that overlap or touch. */
export function mergeRanges(ranges: PrintedRange[]): PrintedRange[] {
  const merged: PrintedRange[] = [];
  for (const r of [...ranges].sort((a, b) => a.s - b.s)) {
    const prev = merged[merged.length - 1];
    if (prev && r.s <= prev.e + 1) prev.e = Math.max(prev.e, r.e);
    else merged.push({ ...r });
  }
  return merged;
}

/** Ranges for a variant. Batches from before ranges were kept count as 1 to last. */
export function printedRanges(
  prefix: string,
  ranges: Record<string, PrintedRange[]>,
  lastPrinted: Record<string, number>
): PrintedRange[] {
  if (ranges[prefix]) return ranges[prefix];
  return lastPrinted[prefix] ? [{ s: 1, e: lastPrinted[prefix] }] : [];
}

/** Lines repeating serials already generated, or repeating an earlier line in the batch. */
export function findSerialConflicts(
  series: Pick<StickerSeries, 'prefix' | 'start' | 'end'>[],
  ranges: Record<string, PrintedRange[]>,
  lastPrinted: Record<string, number>
): SerialConflict[] {
  const seen: Record<string, PrintedRange[]> = {};
  const conflicts: SerialConflict[] = [];
  series.forEach(({ prefix, start, end }, line) => {
    seen[prefix] ??= [...printedRanges(prefix, ranges, lastPrinted)];
    const hit = seen[prefix].find((r) => r.s <= end && r.e >= start);
    if (hit) {
      conflicts.push({
        line,
        prefix,
        start,
        end,
        overlapStart: Math.max(start, hit.s),
        overlapEnd: Math.min(end, hit.e),
        nextStart: Math.max(...seen[prefix].map((r) => r.e)) + 1,
      });
    }
    seen[prefix].push({ s: start, e: end });
  });
  return conflicts;
}

/** One line of the download changelog. */
export interface SerialLogEntry {
  id: string;
  prefix: string;
  modelId: string;
  gender: GenderLetter;
  colorName: string;
  size: string;
  start: number;
  end: number;
  quantity: number;
  /** The admin chose to print serials that were already generated. */
  reprint: boolean;
  source: StickerSource;
  /** "failed" when the PDF could not be built after the numbers were reserved. */
  status: 'generated' | 'failed';
  by: string;
  createdAt: string | null;
}

export type StickerSource = 'batch' | 'excel';

export function countSerials(series: Pick<StickerSeries, 'quantity'>[]): number {
  return series.reduce((n, s) => n + s.quantity, 0);
}

// ── Excel upload ─────────────────────────────────────────────

export const STICKER_SHEET_HEADERS = ['Product ID', 'Color', 'Gender', 'Size', 'Quantity', 'Start'] as const;

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
    const [model, colorText, genderText, size, qty, startText] = raw;
    const color = findColor(colors, colorText) ?? colors.find((c) => c.code === colorText.padStart(2, '0')) ?? null;
    const request = {
      modelId: model.toUpperCase(),
      gender: GENDER_WORDS[genderText.toUpperCase()],
      colorCode: color?.code ?? colorText,
      size: normalizeSize(size),
      quantity: Number(qty),
      ...(startText ? { start: Number(startText) } : {}),
    };
    const error = validateStickerRequest(request, models, colors.map((c) => c.code));
    if (error) errors.push(`Row ${rowNo}: ${error}`);
    else requests.push({ ...request, colorName: color!.name });
  });
  if (!requests.length && !errors.length) errors.push('The sheet has no rows.');
  return { requests, errors };
}
