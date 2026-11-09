'use client';

import { useRef, useState } from 'react';
import { AlertCircle, FileSpreadsheet, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';
import { STICKER_COPIES, countSerials, parseStickerRows, type StickerRequest } from '@/lib/serialgen';
import {
  downloadStickerPdf,
  downloadStickerTemplate,
  readStickerSheet,
  type DownloadedPdf,
  type SerialCatalog,
} from '@/services/serialgenService';
import { PrintedNote } from './StickerBatch';

/**
 * One Excel file per request, straight to PDF: the rows are checked
 * against the product and colour lists, then printed as one batch. They
 * don't go into the batch above.
 */
export default function StickerExcelUpload({ catalog, onPrinted }: { catalog: SerialCatalog; onPrinted: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [requests, setRequests] = useState<StickerRequest[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DownloadedPdf | null>(null);

  const reset = () => {
    setFileName('');
    setRequests([]);
    setErrors([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFile = async (file: File | undefined) => {
    setResult(null);
    setRequests([]);
    setErrors([]);
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = parseStickerRows(await readStickerSheet(file), catalog.models, catalog.colors);
      setRequests(parsed.requests);
      setErrors(parsed.errors);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Could not read the file.']);
    }
  };

  const generate = async () => {
    setSubmitting(true);
    try {
      setResult(await downloadStickerPdf(requests.map(({ modelId, gender, colorCode, size, quantity }) => ({ modelId, gender, colorCode, size, quantity }))));
      reset();
      onPrinted();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Generation failed.']);
    } finally {
      setSubmitting(false);
    }
  };

  const serials = countSerials(requests);

  return (
    <div className="glass-card p-6 space-y-4">
      <p className="text-xs text-[var(--text-muted)]">
        Columns: Product ID, Color, Gender, Size, Quantity (one row per variant). Serials carry on from the last ones
        printed, the same as the batch above.
      </p>
      <div className="flex flex-wrap gap-3 items-center">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={submitting}>
          <Upload size={14} className="inline -mt-0.5 mr-1" /> Choose Excel file
        </Button>
        <button onClick={() => downloadStickerTemplate()} className="text-xs text-[var(--copper-light)] hover:underline flex items-center gap-1">
          <FileSpreadsheet size={13} /> Download template
        </button>
        {fileName && <span className="text-xs text-[var(--text-light)] font-mono">{fileName}</span>}
      </div>

      {errors.length > 0 && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 space-y-1">
          <p className="flex items-center gap-2">
            <AlertCircle size={15} /> Fix these rows and upload the file again:
          </p>
          <ul className="text-xs list-disc pl-6">
            {errors.slice(0, 20).map((e) => (
              <li key={e}>{e}</li>
            ))}
            {errors.length > 20 && <li>…and {errors.length - 20} more</li>}
          </ul>
        </div>
      )}

      {requests.length > 0 && errors.length === 0 && (
        <>
          <p className="text-xs text-[var(--text-muted)]">
            {requests.length} row(s), {serials} serial(s) × {STICKER_COPIES} copies = {serials * STICKER_COPIES} stickers.
          </p>
          <Button variant="copper" onClick={generate} loading={submitting} disabled={submitting}>
            {submitting ? 'Generating PDF…' : 'Generate PDF'}
          </Button>
        </>
      )}

      {result && <PrintedNote result={result} />}
    </div>
  );
}
