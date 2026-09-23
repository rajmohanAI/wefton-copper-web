'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, Star, Trash2, ArrowLeft, ArrowRight, ImageIcon, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { updateProduct } from '@/services/productService';
import { uploadProductImages, filterValidImageFiles } from '@/services/productImageService';
import type { Product, ProductImage } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess: () => void;
}

export default function ProductImageManager({ open, onOpenChange, product, onSuccess }: Props) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [failures, setFailures] = useState<string[]>([]);

  useEffect(() => {
    if (open && product) {
      setImages(product.images ? product.images.map((i) => ({ ...i })) : []);
      setPendingFiles([]);
      setError('');
      setFailures([]);
      setProgress(null);
    }
  }, [open, product]);

  const busy = uploading || saving;

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = filterValidImageFiles(Array.from(e.target.files || []));
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removePending = (idx: number) => setPendingFiles((prev) => prev.filter((_, i) => i !== idx));

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Ensure a primary still exists.
      if (next.length > 0 && !next.some((i) => i.isPrimary)) next[0].isPrimary = true;
      return next;
    });
  };

  const setPrimary = (idx: number) => {
    setImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === idx })));
  };

  const move = (idx: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!product) return;
    setError('');
    setFailures([]);
    try {
      let finalImages = [...images];

      // Upload any pending files first.
      if (pendingFiles.length > 0) {
        setUploading(true);
        setProgress({ done: 0, total: pendingFiles.length });
        const { uploaded, failures: fails } = await uploadProductImages(
          product.productId,
          pendingFiles,
          product.title,
          finalImages.length === 0,
          (done, total) => setProgress({ done, total })
        );
        finalImages = [...finalImages, ...uploaded];
        if (fails.length > 0) setFailures(fails.map((f) => `${f.fileName}: ${f.message}`));
        setUploading(false);
      }

      // Guarantee exactly one primary.
      if (finalImages.length > 0 && !finalImages.some((i) => i.isPrimary)) {
        finalImages[0].isPrimary = true;
      }

      setSaving(true);
      await updateProduct(product.productId, { images: finalImages });
      setSaving(false);

      // Keep uploaded images visible; clear only the pending queue.
      setImages(finalImages);
      setPendingFiles([]);
      setProgress(null);

      if (failures.length === 0) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (e) {
      setUploading(false);
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Failed to save images.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[720px] md:max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
            <Dialog.Title className="text-lg font-light text-[var(--text-light)] flex items-center gap-2">
              <ImageIcon size={18} className="text-[var(--copper-light)]" />
              Manage Images{product ? ` — ${product.title}` : ''}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors disabled:opacity-40" disabled={busy}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Existing/current images */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]">Current Images ({images.length})</h3>
              {images.length === 0 ? (
                <p className="text-xs text-[var(--text-faint)] italic">No images yet. Add some below.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div key={`${img.url}-${idx}`} className="relative group rounded border border-white/10 overflow-hidden">
                      <div className="aspect-square bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                      </div>
                      {img.isPrimary && (
                        <span className="absolute top-1 left-1 bg-[var(--copper-main)] text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Star size={9} /> Primary
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/60 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 text-white/80 hover:text-white disabled:opacity-30" title="Move left"><ArrowLeft size={12} /></button>
                        <button onClick={() => setPrimary(idx)} disabled={img.isPrimary} className="p-1 text-white/80 hover:text-[var(--copper-light)] disabled:opacity-30" title="Set primary"><Star size={12} /></button>
                        <button onClick={() => removeImage(idx)} className="p-1 text-white/80 hover:text-red-400" title="Remove"><Trash2 size={12} /></button>
                        <button onClick={() => move(idx, 1)} disabled={idx === images.length - 1} className="p-1 text-white/80 hover:text-white disabled:opacity-30" title="Move right"><ArrowRight size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending files */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]">To Upload ({pendingFiles.length})</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {pendingFiles.map((file, idx) => (
                    <div key={idx} className="relative group rounded border border-blue-500/30 overflow-hidden">
                      <div className="aspect-square bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="absolute top-1 left-1 bg-blue-600/80 text-white text-[9px] px-1.5 py-0.5 rounded">New</span>
                      <button onClick={() => removePending(idx)} className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={11} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center justify-center gap-2 px-4 py-4 border border-dashed border-white/20 rounded cursor-pointer hover:border-[var(--copper-main)]/50 transition-colors">
              <Upload size={16} className="text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-muted)]">Add images (JPEG, PNG, WebP, max 10MB)</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleSelect} className="hidden" disabled={busy} />
            </label>

            {progress && (
              <div className="space-y-1">
                <div className="h-1.5 bg-white/10 rounded overflow-hidden">
                  <div className="h-full bg-[var(--copper-main)] transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">Uploading {progress.done} of {progress.total}…</p>
              </div>
            )}

            {failures.length > 0 && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 space-y-1">
                <p className="flex items-center gap-1.5 font-medium"><AlertCircle size={14} /> Some uploads failed (others were kept):</p>
                {failures.map((f, i) => <p key={i} className="pl-5">{f}</p>)}
              </div>
            )}
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button variant="copper" onClick={handleSave} loading={busy} disabled={busy}>
              {uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save Images'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
