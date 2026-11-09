// ============================================================
// Wefton Copper — Serial generator API calls (browser)
// Talks to /api/serialgen; the server keeps the product/model list and
// the last piece no printed per variant.
// ============================================================
import { getFirebaseAuth } from '@/lib/firebase';
import type { CatalogColor } from '@/lib/productCodes';
import { STICKER_SHEET_HEADERS, type SerialModel, type StickerRequest } from '@/lib/serialgen';

export interface SerialCatalog {
  models: SerialModel[];
  colors: CatalogColor[];
  last: Record<string, number>;
}

export interface DownloadedPdf {
  file: string;
  count: number;
  series: { prefix: string; start: number; end: number }[];
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

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Reserves the serials for `items`, then downloads the sticker PDF. */
export async function downloadStickerPdf(items: StickerRequest[]): Promise<DownloadedPdf> {
  const res = await fetch('/api/serialgen', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw await errorFrom(res);
  const file = res.headers.get('X-Serial-Filename') || 'stickers.pdf';
  saveBlob(await res.blob(), file);
  return {
    file,
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
    ['P01', 'Olive Green', 'Men', 'M', 20],
    ['P01', 'Deep Blue', 'Women', 'S', 20],
  ]);
  sheet['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 8 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Stickers');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  saveBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'sticker-batch-template.xlsx');
}
