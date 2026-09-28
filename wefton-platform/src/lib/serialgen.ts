// ============================================================
// Wefton Copper — Serial / Barcode Generation (pure logic)
// ============================================================
// Builds the list of serial strings from prefix/suffix/start/end/increment
// and validates the input. No I/O here so it is trivially unit-testable and
// safe to import from both server and (for preview) client code.

export interface SerialConfig {
  prefix: string;
  suffix: string;
  start: number;
  end: number;
  increment: number;
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
 * serials align (e.g. end=100 → 001, 010, 100).
 */
export function buildSerials(cfg: SerialConfig): string[] {
  const { prefix, suffix, start, end, increment } = cfg;
  const padWidth = String(end).length;
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
