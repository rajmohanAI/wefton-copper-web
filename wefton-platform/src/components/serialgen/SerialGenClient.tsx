'use client';

import { useMemo, useState } from 'react';
import { Barcode, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { validateSerialConfig, buildSerials, type SerialConfig } from '@/lib/serialgen';

interface GenResult {
  file: string;
  count: number;
  first: string;
  last: string;
}

export default function SerialGenClient() {
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [start, setStart] = useState('1');
  const [end, setEnd] = useState('100');
  const [increment, setIncrement] = useState('1');
  const [barcodeType, setBarcodeType] = useState<'code128' | 'qrcode'>('code128');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenResult | null>(null);

  const cfg: SerialConfig = useMemo(
    () => ({
      prefix,
      suffix,
      start: Number(start),
      end: Number(end),
      increment: Number(increment),
    }),
    [prefix, suffix, start, end, increment]
  );

  const validation = useMemo(() => validateSerialConfig(cfg), [cfg]);

  // Small live preview of the first few serials.
  const preview = useMemo(() => {
    if (!validation.valid) return [];
    return buildSerials(cfg).slice(0, 5);
  }, [validation.valid, cfg]);

  const handleGenerate = async () => {
    setError('');
    setResult(null);
    if (!validation.valid) {
      setError(validation.error || 'Invalid configuration.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/serialgen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cfg, barcodeType }),
      });

      // Errors come back as JSON; success comes back as a ZIP file.
      if (!res.ok) {
        let message = 'Generation failed.';
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          /* non-JSON error body */
        }
        setError(message);
        return;
      }

      // Read the PDF as a Blob and trigger a download to the user's device.
      const blob = await res.blob();
      const filename =
        res.headers.get('X-Serial-Filename') || 'barcodes.pdf';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setResult({
        file: filename,
        count: Number(res.headers.get('X-Serial-Count') || 0),
        first: decodeURIComponent(res.headers.get('X-Serial-First') || ''),
        last: decodeURIComponent(res.headers.get('X-Serial-Last') || ''),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-light text-[var(--copper-light)] mb-2 flex items-center gap-2">
          <Barcode size={28} /> Serial / Barcode Generator
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">
          Generate a batch of product barcodes laid out in sequence into a single, high-quality
          PDF that downloads to your device — ready to send to print vendors for inkless thermal
          sticker printing.
        </p>

        <div className="glass-card p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="WC-" />
            <Input label="Suffix" value={suffix} onChange={(e) => setSuffix(e.target.value)} placeholder="-A" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Start Value" type="number" value={start} onChange={(e) => setStart(e.target.value)} min="0" />
            <Input label="End Value" type="number" value={end} onChange={(e) => setEnd(e.target.value)} min="0" />
            <Input label="Increment" type="number" value={increment} onChange={(e) => setIncrement(e.target.value)} min="1" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]">Barcode Type</label>
            <select
              value={barcodeType}
              onChange={(e) => setBarcodeType(e.target.value as 'code128' | 'qrcode')}
              className="h-11 bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-sm px-3 focus:outline-none focus:border-[var(--copper-main)]"
            >
              <option value="code128" className="bg-[var(--bg-dark)]">Code 128 (1D barcode)</option>
              <option value="qrcode" className="bg-[var(--bg-dark)]">QR Code</option>
            </select>
          </div>

          {/* Live preview / validation */}
          <div className="rounded border border-white/10 bg-black/20 p-3 text-xs">
            {validation.valid ? (
              <div className="space-y-1">
                <p className="text-[var(--text-muted)]">
                  Will generate <span className="text-[var(--copper-light)] font-medium">{validation.count}</span> barcode(s):
                </p>
                <p className="font-mono text-[var(--text-light)]">
                  {preview.join(', ')}{validation.count && validation.count > preview.length ? ' …' : ''}
                </p>
              </div>
            ) : (
              <p className="text-amber-300 flex items-center gap-1.5"><AlertCircle size={13} /> {validation.error}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
            </p>
          )}

          <Button variant="copper" onClick={handleGenerate} loading={submitting} disabled={submitting || !validation.valid}>
            {submitting ? 'Generating PDF…' : 'Generate & Download PDF'}
          </Button>

          {result && (
            <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-1">
              <p className="text-sm text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} /> Downloaded {result.count} barcode(s): {result.first} … {result.last}
              </p>
              <p className="text-[10px] text-[var(--text-faint)] flex items-center gap-1.5">
                <Download size={11} /> Saved to your device as {result.file}. Check your browser&apos;s downloads folder.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
