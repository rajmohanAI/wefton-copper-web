'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { formatSerial, type SerialConflict, type StickerRequest, type StickerSource } from '@/lib/serialgen';
import { StickerConflict, downloadStickerPdf, type DownloadedPdf } from '@/services/serialgenService';

const pieceNo = (n: number) => String(n).padStart(6, '0');

/**
 * Sends a sticker batch to the server. When it repeats serials already
 * generated, `dialog` asks the admin to move those lines on to the next free
 * numbers, print them anyway, or cancel.
 */
export function useStickerPrint(source: StickerSource, onPrinted: () => void) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DownloadedPdf | null>(null);
  const [pending, setPending] = useState<{ items: StickerRequest[]; conflicts: SerialConflict[] } | null>(null);

  const print = async (items: StickerRequest[], override = false) => {
    setError('');
    setResult(null);
    setSubmitting(true);
    try {
      setResult(await downloadStickerPdf(items, source, override));
      setPending(null);
      onPrinted();
    } catch (e) {
      if (e instanceof StickerConflict) {
        setPending({ items, conflicts: e.conflicts });
      } else {
        setPending(null);
        setError(e instanceof Error ? e.message : 'Generation failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Drops the chosen start from the repeated lines, so they carry on from the last number printed. */
  const applyNextNumbers = () => {
    if (!pending) return;
    const repeated = new Set(pending.conflicts.map((c) => c.line));
    print(
      pending.items.map((item, i) => {
        if (!repeated.has(i)) return item;
        const next = { ...item };
        delete next.start;
        return next;
      })
    );
  };

  const dialog = (
    <Dialog.Root open={!!pending} onOpenChange={(open) => !open && !submitting && setPending(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-xl bg-[var(--wc-surface)] text-[var(--text-light)] border border-[var(--wc-line)] rounded-lg shadow-xl z-[60] p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base font-medium text-[var(--text-light)]">
                These serials were already generated
              </Dialog.Title>
              <Dialog.Description className="text-sm text-[var(--text-muted)] mt-1">
                Move the start value on to the next free number, or print them again if you really need duplicates.
              </Dialog.Description>
              <ul className="mt-3 max-h-48 overflow-y-auto space-y-2 text-xs">
                {pending?.conflicts.map((c) => (
                  <li key={c.line} className="rounded border border-[var(--wc-line)] p-2">
                    <p className="font-mono">
                      {formatSerial(c.prefix, c.overlapStart)} – {pieceNo(c.overlapEnd)}
                    </p>
                    <p className="text-[var(--text-muted)] mt-0.5">
                      Next free number: <span className="font-mono">{pieceNo(c.nextStart)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setPending(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => pending && print(pending.items, true)} disabled={submitting}>
              Print anyway
            </Button>
            <Button variant="copper" onClick={applyNextNumbers} loading={submitting} disabled={submitting}>
              Use next numbers
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  return { print, submitting, error, result, clearResult: () => setResult(null), dialog };
}
