// ============================================================
// Wefton Copper — Serial generator API calls (browser)
// Talks to /api/serialgen; the server keeps the product/model list and
// the last piece no printed per variant.
// ============================================================
import { getFirebaseAuth } from '@/lib/firebase';
import type { CatalogColor } from '@/lib/productCodes';
import {
  STICKER_SHEET_HEADERS,
  type SerialConflict,
  type SerialLogEntry,
  type SerialModel,
  type StickerRequest,
  type StickerSource,
} from '@/lib/serialgen';

export interface SerialCatalog {
  models: SerialModel[];
  colors: CatalogColor[];
  last: Record<string, number>;
}

/** 'a4' is the sticker sheet; 'roll' gives two 2-inch roll PDFs, stickers and tags (WC-Issue-15). */
export type StickerDownloadFormat = 'a4' | 'roll';

export interface DownloadedPdf {
  /** The PDFs saved, kept so they can be saved again without generating new serials. */
  files: { name: string; blob: Blob }[];
  count: number;
  series: { prefix: string; start: number; end: number }[];
}

/** Thrown when a batch repeats serials already generated. */
export class StickerConflict extends Error {
  constructor(public conflicts: SerialConflict[]) {
    super('Some of these serials were already generated.');
    this.name = 'StickerConflict';
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getFirebaseAuth()?.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in again');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function errorFrom(res: Response): Promise<Error> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return new Error(data.error || 'Request failed');
}

export async function fetchSerialCatalog(): Promise<SerialCatalog> {
  const res = await fetch('/api/serialgen', { headers: await authHeaders(), cache: 'no-store' });
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export async function createSerialModel(name: string): Promise<SerialModel[]> {
  const res = await fetch('/api/serialgen/models', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()).models;
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** The latest lines of the download changelog. */
export async function fetchSerialLog(): Promise<SerialLogEntry[]> {
  const res = await fetch('/api/serialgen/history', { headers: await authHeaders(), cache: 'no-store' });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()).entries;
}

/** Archives the download history and restarts every variant at 000001. Returns how many lines moved. */
export async function clearSerialLog(): Promise<number> {
  const res = await fetch('/api/serialgen/history', { method: 'DELETE', headers: await authHeaders() });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()).archived;
}

/**
 * Reserves the serials for `items`, then downloads the sticker PDF. Throws
 * StickerConflict when serials were already generated, unless `override`.
 */
export async function downloadStickerPdf(
  items: StickerRequest[],
  source: StickerSource,
  override = false,
  format: StickerDownloadFormat = 'a4'
): Promise<DownloadedPdf> {
  const res = await fetch('/api/serialgen', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ items, source, override, format }),
  });
  if (res.status === 409) {
    const data = (await res.clone().json().catch(() => ({}))) as { conflicts?: SerialConflict[] };
    if (data.conflicts?.length) throw new StickerConflict(data.conflicts);
  }
  if (!res.ok) throw await errorFrom(res);
  if (format === 'roll') {
    const data = (await res.json()) as Omit<DownloadedPdf, 'files'> & { files: { name: string; pdf: string }[] };
    const files = data.files.map((f) => ({
      name: f.name,
      blob: new Blob([Uint8Array.from(atob(f.pdf), (c) => c.charCodeAt(0))], { type: 'application/pdf' }),
    }));
    files.forEach((f) => saveBlob(f.blob, f.name));
    return { files, count: data.count, series: data.series };
  }
  const name = res.headers.get('X-Serial-Filename') || 'stickers.pdf';
  const blob = await res.blob();
  saveBlob(blob, name);
  return {
    files: [{ name, blob }],
    count: Number(res.headers.get('X-Serial-Count') || 0),
    series: JSON.parse(decodeURIComponent(res.headers.get('X-Serial-Series') || '%5B%5D')),
  };
}

/** Reads the first sheet of an .xlsx file into header → value rows. */
export async function readStickerSheet(file: File): Promise<Record<string, unknown>[]> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Please upload an Excel (.xlsx) file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('File is too large. Please keep uploads under 5 MB.');
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('The Excel file has no sheets.');
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
}

/** Downloads a ready-to-fill template with two example rows. */
export async function downloadStickerTemplate() {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([
    [...STICKER_SHEET_HEADERS],
    ['P01', 'Olive Green', 'Men', 'M', 20, ''],
    ['P01', 'Deep Blue', 'Women', 'S', 20, ''],
  ]);
  sheet['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Stickers');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  saveBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'sticker-batch-template.xlsx');
}
