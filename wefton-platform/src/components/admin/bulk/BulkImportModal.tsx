'use client';

import { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { downloadTemplate, type ImportMode } from '@/lib/bulkImportTemplates';
import { buildErrorReport } from '@/services/bulkImportService';
import { useBulkImport } from './useBulkImport';
import ImportPreviewTable from './ImportPreviewTable';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MODES: { key: ImportMode; label: string; hint: string }[] = [
  { key: 'update-stock', label: 'Update Stock', hint: 'Adjust inventory on existing products by SKU' },
  { key: 'create-products', label: 'Create Products', hint: 'Add new products from a file' },
];

export default function BulkImportModal({ open, onOpenChange, onSuccess }: Props) {
  const { state, setMode, selectFile, runCommit, reset } = useBulkImport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { phase, mode, fileName, outcome, commitResult, progress, error } = state;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file, mode);
    e.target.value = '';
  };

  const handleClose = (next: boolean) => {
    if (phase === 'committing') return; // block close mid-commit
    if (!next) reset();
    onOpenChange(next);
  };

  const handleDownloadReport = () => {
    if (!outcome) return;
    const csv = buildErrorReport(outcome, commitResult ?? undefined);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wefton-import-report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDone = () => {
    onSuccess();
    handleClose(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[780px] md:max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
            <Dialog.Title className="text-lg font-light text-[var(--text-light)] flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-[var(--copper-light)]" /> Bulk Import
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors disabled:opacity-40" disabled={phase === 'committing'}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Step 1: mode + file (hidden once previewed/done) */}
            {(phase === 'idle' || phase === 'parsing' || phase === 'error') && (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[var(--text-light)] tracking-wider uppercase">1. Choose Mode</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MODES.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        className={`text-left p-4 rounded border transition-colors ${
                          mode === m.key
                            ? 'border-[var(--copper-main)] bg-white/5'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <p className="text-sm text-[var(--text-light)]">{m.label}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{m.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[var(--text-light)] tracking-wider uppercase">2. Upload File</h3>
                  <button
                    onClick={() => downloadTemplate(mode)}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--copper-light)] hover:text-[var(--copper-main)] transition-colors"
                  >
                    <Download size={13} /> Download {mode === 'update-stock' ? 'stock' : 'products'} template (CSV)
                  </button>
                  <label className="flex items-center gap-2 px-4 py-6 border border-dashed border-white/20 rounded cursor-pointer hover:border-[var(--copper-main)]/50 transition-colors justify-center">
                    <Upload size={16} className="text-[var(--text-muted)]" />
                    <span className="text-sm text-[var(--text-muted)]">
                      {phase === 'parsing' ? 'Reading file…' : 'Select a .csv or .xlsx file'}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleFile}
                      className="hidden"
                      disabled={phase === 'parsing'}
                    />
                  </label>
                  {error && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-start gap-2">
                      <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Step 3: preview */}
            {(phase === 'previewed' || phase === 'committing') && outcome && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--text-light)] tracking-wider uppercase">Preview — {fileName}</h3>
                  <span className="text-xs text-[var(--text-muted)]">{mode === 'update-stock' ? 'Update Stock' : 'Create Products'}</span>
                </div>

                {outcome.missingColumns.length > 0 ? (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                    Missing required column(s): {outcome.missingColumns.join(', ')}. Download the template for the correct headers.
                  </p>
                ) : (
                  <>
                    <ImportPreviewTable outcome={outcome} />
                    {outcome.errors > 0 && outcome.applicable > 0 && (
                      <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2">
                        {outcome.errors} row(s) have errors and will be skipped. {outcome.applicable} valid row(s) will be committed.
                      </p>
                    )}
                    {progress && (
                      <div className="space-y-1">
                        <div className="h-1.5 bg-white/10 rounded overflow-hidden">
                          <div className="h-full bg-[var(--copper-main)] transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)]">{progress.done} of {progress.total} processed</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Step 4: result */}
            {phase === 'done' && commitResult && (
              <div className="space-y-4 text-center py-4">
                <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
                <h3 className="text-lg font-light text-[var(--text-light)]">Import complete</h3>
                <div className="flex justify-center gap-6 text-sm">
                  {mode === 'create-products' && <span className="text-[var(--text-muted)]">Created: <span className="text-emerald-400">{commitResult.created}</span></span>}
                  {mode === 'update-stock' && <span className="text-[var(--text-muted)]">Updated: <span className="text-emerald-400">{commitResult.updated}</span></span>}
                  {outcome && <span className="text-[var(--text-muted)]">Skipped: <span className="text-amber-400">{outcome.skipped}</span></span>}
                  <span className="text-[var(--text-muted)]">Failed: <span className={commitResult.failed ? 'text-red-400' : 'text-[var(--text-light)]'}>{commitResult.failed}</span></span>
                </div>
                {(commitResult.failed > 0 || (outcome && (outcome.errors > 0 || outcome.skipped > 0))) && (
                  <button onClick={handleDownloadReport} className="inline-flex items-center gap-1.5 text-xs text-[var(--copper-light)] hover:text-[var(--copper-main)] transition-colors">
                    <Download size={13} /> Download report
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-subtle)]">
            {phase === 'previewed' && outcome && (
              <>
                <Button variant="ghost" onClick={reset}>Start Over</Button>
                <Button
                  variant="copper"
                  onClick={() => runCommit(outcome)}
                  disabled={outcome.missingColumns.length > 0 || outcome.applicable === 0}
                >
                  Commit {outcome.applicable} row(s)
                </Button>
              </>
            )}
            {phase === 'committing' && (
              <Button variant="copper" loading disabled>Committing…</Button>
            )}
            {phase === 'done' && (
              <Button variant="copper" onClick={handleDone}>Done</Button>
            )}
            {(phase === 'idle' || phase === 'parsing' || phase === 'error') && (
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
