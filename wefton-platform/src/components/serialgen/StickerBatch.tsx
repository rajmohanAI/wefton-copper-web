'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CATALOG_SIZES, type GenderLetter } from '@/lib/productCodes';
import {
  STICKER_COPIES,
  STICKERS_PER_PAGE,
  countSerials,
  formatSerial,
  planSeries,
  type StickerRequest,
} from '@/lib/serialgen';
import { createSerialModel, downloadStickerPdf, type DownloadedPdf, type SerialCatalog } from '@/services/serialgenService';

type QueueItem = StickerRequest & { id: string; colorName: string };

const QUEUE_KEY = 'wefton.serialgen.queue';
const GENDERS: { letter: GenderLetter; label: string }[] = [
  { letter: 'M', label: 'Men' },
  { letter: 'W', label: 'Women' },
  { letter: 'U', label: 'Unisex' },
];
const SELECT =
  'h-11 w-full bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-sm px-3 focus:outline-none focus:border-[var(--copper-main)]';

function loadQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT}>
        {children}
      </select>
    </div>
  );
}

/**
 * Build a batch line by line (product, colour, gender, size, quantity),
 * review the serial ranges, then print them all in one PDF. The batch is
 * kept in this browser until it is printed.
 */
export default function StickerBatch({
  catalog,
  onCatalogChange,
  onPrinted,
}: {
  catalog: SerialCatalog;
  onCatalogChange: (c: SerialCatalog) => void;
  onPrinted: () => void;
}) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modelId, setModelId] = useState(catalog.models[0]?.id ?? '');
  const [colorCode, setColorCode] = useState(catalog.colors[0]?.code ?? '');
  const [gender, setGender] = useState<GenderLetter>('M');
  const [size, setSize] = useState('M');
  const [quantity, setQuantity] = useState('20');
  const [newModel, setNewModel] = useState('');
  const [addingModel, setAddingModel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DownloadedPdf | null>(null);

  useEffect(() => {
    setQueue(loadQueue());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      /* storage unavailable: the batch just won't survive a reload */
    }
  }, [queue, loaded]);

  // Serial ranges as they will print, continuing from the last printed numbers.
  const plan = useMemo(() => {
    try {
      return planSeries(queue, catalog.last).series;
    } catch {
      return null;
    }
  }, [queue, catalog.last]);

  const nextFor = useMemo(() => {
    const color = catalog.colors.find((c) => c.code === colorCode);
    if (!color) return null;
    try {
      const { series } = planSeries([...queue, { modelId, gender, colorCode, colorName: color.name, size, quantity: 1 }], catalog.last);
      const s = series[series.length - 1];
      return formatSerial(s.prefix, s.start);
    } catch {
      return null;
    }
  }, [queue, modelId, gender, colorCode, size, catalog]);

  const qty = parseInt(quantity, 10);
  const canAdd = !!modelId && !!colorCode && Number.isInteger(qty) && qty >= 1 && !!nextFor;

  const addLine = () => {
    const color = catalog.colors.find((c) => c.code === colorCode);
    if (!canAdd || !color) return;
    setQueue((q) => [...q, { id: crypto.randomUUID(), modelId, gender, colorCode, colorName: color.name, size, quantity: qty }]);
    setResult(null);
  };

  const addModel = async () => {
    setError('');
    setAddingModel(true);
    try {
      const models = await createSerialModel(newModel);
      onCatalogChange({ ...catalog, models });
      setModelId(models[models.length - 1].id);
      setNewModel('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add product.');
    } finally {
      setAddingModel(false);
    }
  };

  const generate = async () => {
    setError('');
    setResult(null);
    setSubmitting(true);
    try {
      const pdf = await downloadStickerPdf(queue.map(({ modelId, gender, colorCode, size, quantity }) => ({ modelId, gender, colorCode, size, quantity })));
      setResult(pdf);
      setQueue([]);
      onPrinted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const serials = countSerials(queue);
  const modelName = catalog.models.find((m) => m.id === modelId)?.name;

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <Select label="Product ID" value={modelId} onChange={setModelId}>
          {catalog.models.map((m) => (
            <option key={m.id} value={m.id} className="bg-[var(--bg-dark)]">
              {m.id} — {m.name}
            </option>
          ))}
        </Select>
        <div className="flex gap-2 items-end">
          <Input label="New product" value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="Model name" />
          <Button variant="secondary" onClick={addModel} loading={addingModel} disabled={!newModel.trim() || addingModel}>
            Add
          </Button>
        </div>
      </div>
      {modelName && <p className="-mt-3 text-xs text-[var(--text-muted)]">{modelName}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Select label="Color" value={colorCode} onChange={setColorCode}>
          {catalog.colors.map((c) => (
            <option key={c.code} value={c.code} className="bg-[var(--bg-dark)]">
              {c.code} — {c.name}
            </option>
          ))}
        </Select>
        <Select label="Gender" value={gender} onChange={(v) => setGender(v as GenderLetter)}>
          {GENDERS.map((g) => (
            <option key={g.letter} value={g.letter} className="bg-[var(--bg-dark)]">
              {g.label}
            </option>
          ))}
        </Select>
        <Select label="Size" value={size} onChange={setSize}>
          {CATALOG_SIZES.map((s) => (
            <option key={s} value={s} className="bg-[var(--bg-dark)]">
              {s}
            </option>
          ))}
        </Select>
        <Input label="Quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">
          {nextFor ? (
            <>Next serial: <span className="font-mono text-[var(--text-light)]">{nextFor}</span></>
          ) : (
            'Pick a product, colour and size.'
          )}
        </p>
        <Button variant="secondary" onClick={addLine} disabled={!canAdd}>
          <Plus size={14} className="inline -mt-0.5 mr-1" /> Add to batch
        </Button>
      </div>

      {/* Batch */}
      <div className="rounded border border-white/10 bg-black/20">
        {queue.length === 0 ? (
          <p className="p-4 text-xs text-[var(--text-muted)]">The batch is empty. Add lines above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[var(--text-muted)] text-left">
                <tr>
                  <th className="p-2 font-medium">Product</th>
                  <th className="p-2 font-medium">Color</th>
                  <th className="p-2 font-medium">Gender</th>
                  <th className="p-2 font-medium">Size</th>
                  <th className="p-2 font-medium text-right">Qty</th>
                  <th className="p-2 font-medium">Serials</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {queue.map((item, i) => {
                  const s = plan?.[i];
                  return (
                    <tr key={item.id} className="border-t border-white/5 text-[var(--text-light)]">
                      <td className="p-2">{item.modelId}</td>
                      <td className="p-2">{item.colorName}</td>
                      <td className="p-2">{GENDERS.find((g) => g.letter === item.gender)?.label}</td>
                      <td className="p-2">{item.size}</td>
                      <td className="p-2 text-right">{item.quantity}</td>
                      <td className="p-2 font-mono whitespace-nowrap">
                        {s ? `${formatSerial(s.prefix, s.start)} – ${String(s.end).padStart(6, '0')}` : '—'}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => setQueue((q) => q.filter((x) => x.id !== item.id))}
                          className="text-[var(--text-muted)] hover:text-red-400"
                          aria-label="Remove line"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {queue.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          {serials} serial(s) × {STICKER_COPIES} copies = {serials * STICKER_COPIES} stickers, about{' '}
          {Math.ceil((serials * STICKER_COPIES) / STICKERS_PER_PAGE)} A4 page(s).
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-start gap-2">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="copper" onClick={generate} loading={submitting} disabled={submitting || queue.length === 0}>
          {submitting ? 'Generating PDF…' : 'Generate PDF'}
        </Button>
        {queue.length > 0 && (
          <Button variant="ghost" onClick={() => setQueue([])} disabled={submitting}>
            Clear batch
          </Button>
        )}
      </div>

      {result && <PrintedNote result={result} />}
    </div>
  );
}

export function PrintedNote({ result }: { result: DownloadedPdf }) {
  return (
    <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-1">
      <p className="text-sm text-emerald-300 flex items-center gap-2">
        <CheckCircle2 size={16} /> Downloaded {result.file} with {result.count} serial(s).
      </p>
      <ul className="text-[11px] font-mono text-[var(--text-muted)]">
        {result.series.map((s, i) => (
          <li key={i}>
            {formatSerial(s.prefix, s.start)} – {formatSerial(s.prefix, s.end)}
          </li>
        ))}
      </ul>
    </div>
  );
}
