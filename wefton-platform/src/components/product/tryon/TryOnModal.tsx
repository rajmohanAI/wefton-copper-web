'use client';

import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Sparkles, ShoppingBag, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { getTryOnProvider } from '@/services/tryon';
import type { TryOnResult } from '@/services/tryon/types';
import { useEphemeralImage } from './useEphemeralImage';
import TryOnConsent from './TryOnConsent';
import TryOnUpload from './TryOnUpload';
import TryOnViewer from './TryOnViewer';
import type { Product, ProductVariant } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  selectedSize: string;
  selectedVariant: ProductVariant | null;
  onAddToCart: () => void;
}

type Phase = 'consent' | 'upload' | 'generating' | 'preview' | 'error' | 'unsupported';

export default function TryOnModal({
  open,
  onOpenChange,
  product,
  selectedSize,
  selectedVariant,
  onAddToCart,
}: Props) {
  const [phase, setPhase] = useState<Phase>('consent');
  const [accepted, setAccepted] = useState(false);
  const [height, setHeight] = useState('');
  const [size, setSize] = useState(selectedSize || '');
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<TryOnResult | null>(null);

  const { photoUrl, hasPhoto, setPhoto, getPhoto, trackResultUrls, clear } = useEphemeralImage();
  const abortRef = useRef<AbortController | null>(null);

  // Reset to a fresh session whenever the modal opens.
  useEffect(() => {
    if (open) {
      setPhase('consent');
      setAccepted(false);
      setHeight('');
      setSize(selectedSize || '');
      setUploadError('');
      setError('');
      setResult(null);
    }
  }, [open, selectedSize]);

  const garmentImageUrl =
    product.tryOnImage ||
    product.images?.find((i) => i.isPrimary)?.url ||
    product.images?.[0]?.url ||
    '';

  const handleGenerate = async () => {
    const photo = getPhoto();
    if (!photo) {
      setUploadError('Please upload a photo first.');
      return;
    }
    setError('');
    const provider = getTryOnProvider();

    if (!(await provider.isSupported())) {
      setPhase('unsupported');
      return;
    }

    setPhase('generating');
    abortRef.current = new AbortController();
    try {
      const res = await provider.generate(
        {
          photo,
          garmentImageUrl,
          heightCm: height ? Number(height) : undefined,
          size,
          gender: product.gender,
        },
        abortRef.current.signal
      );
      trackResultUrls(res.frames);
      setResult(res);
      setPhase('preview');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Could not generate the preview.');
      setPhase('error');
    }
  };

  const handleClose = (next: boolean) => {
    if (phase === 'generating') {
      abortRef.current?.abort();
    }
    if (!next) clear(); // wipe the photo + frames immediately on close
    onOpenChange(next);
  };

  const handleAddToCart = () => {
    onAddToCart();
    handleClose(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[560px] md:max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
            <Dialog.Title className="text-lg font-light text-[var(--text-light)] flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--copper-light)]" /> Try On — {product.title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors" aria-label="Close">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {phase === 'consent' && (
              <TryOnConsent accepted={accepted} onAcceptedChange={setAccepted} />
            )}

            {phase === 'upload' && (
              <TryOnUpload
                photoUrl={photoUrl}
                onSelectFile={setPhoto}
                onRemovePhoto={clear}
                height={height}
                onHeightChange={setHeight}
                size={size}
                onSizeChange={setSize}
                error={uploadError}
                onError={setUploadError}
              />
            )}

            {phase === 'generating' && (
              <div className="py-12 flex flex-col items-center gap-4">
                <div className="h-8 w-8 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
                <p className="text-sm text-[var(--text-muted)]">Generating your preview on your device…</p>
                <p className="text-[10px] text-[var(--text-faint)]">Your photo never leaves this device.</p>
              </div>
            )}

            {phase === 'preview' && result && <TryOnViewer result={result} />}

            {phase === 'error' && (
              <div className="py-8 text-center space-y-3">
                <AlertCircle size={28} className="text-red-400 mx-auto" />
                <p className="text-sm text-red-400">{error}</p>
                <p className="text-xs text-[var(--text-muted)]">Please try again with a different photo.</p>
              </div>
            )}

            {phase === 'unsupported' && (
              <div className="py-8 text-center space-y-3">
                <AlertCircle size={28} className="text-amber-400 mx-auto" />
                <p className="text-sm text-[var(--text-light)]">Try-On isn&apos;t available on this device or browser.</p>
                <p className="text-xs text-[var(--text-muted)]">It needs a modern browser with graphics support. Please try a different device.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-subtle)]">
            {phase === 'consent' && (
              <Button variant="copper" onClick={() => setPhase('upload')} disabled={!accepted}>
                Continue
              </Button>
            )}
            {phase === 'upload' && (
              <>
                <Button variant="ghost" onClick={() => setPhase('consent')}>Back</Button>
                <Button variant="copper" onClick={handleGenerate} disabled={!hasPhoto || !garmentImageUrl}>
                  Generate Preview
                </Button>
              </>
            )}
            {phase === 'generating' && (
              <Button variant="ghost" onClick={() => { abortRef.current?.abort(); setPhase('upload'); }}>
                Cancel
              </Button>
            )}
            {phase === 'preview' && (
              <>
                <Button variant="ghost" onClick={() => setPhase('upload')}>Try Another Photo</Button>
                <Button variant="copper" onClick={handleAddToCart}>
                  <ShoppingBag size={15} /> Add to Cart
                </Button>
              </>
            )}
            {(phase === 'error') && (
              <Button variant="copper" onClick={() => setPhase('upload')}>Try Again</Button>
            )}
            {phase === 'unsupported' && (
              <Button variant="ghost" onClick={() => handleClose(false)}>Close</Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
