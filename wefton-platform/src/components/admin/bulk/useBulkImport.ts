'use client';

import { useCallback, useRef, useState } from 'react';
import {
  parseFile,
  loadExistingProducts,
  validateStockRows,
  validateProductRows,
  commit as commitOutcome,
  type ValidationOutcome,
  type CommitResult,
} from '@/services/bulkImportService';
import type { ImportMode } from '@/lib/bulkImportTemplates';

export type ImportPhase =
  | 'idle'
  | 'parsing'
  | 'previewed'
  | 'committing'
  | 'done'
  | 'error';

interface BulkImportState {
  phase: ImportPhase;
  mode: ImportMode;
  fileName: string | null;
  outcome: ValidationOutcome | null;
  commitResult: CommitResult | null;
  progress: { done: number; total: number } | null;
  error: string | null;
}

const initialState: BulkImportState = {
  phase: 'idle',
  mode: 'update-stock',
  fileName: null,
  outcome: null,
  commitResult: null,
  progress: null,
  error: null,
};

export function useBulkImport() {
  const [state, setState] = useState<BulkImportState>(initialState);
  const committingRef = useRef(false);

  const setMode = useCallback((mode: ImportMode) => {
    setState((s) => ({ ...initialState, mode }));
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...initialState, mode: s.mode }));
  }, []);

  const selectFile = useCallback(async (file: File, mode: ImportMode) => {
    setState((s) => ({ ...s, phase: 'parsing', fileName: file.name, error: null, outcome: null, commitResult: null }));
    try {
      const rows = await parseFile(file);
      const products = await loadExistingProducts();
      const outcome =
        mode === 'update-stock'
          ? await validateStockRows(rows, products)
          : await validateProductRows(rows, products);
      setState((s) => ({ ...s, phase: 'previewed', outcome }));
    } catch (e) {
      setState((s) => ({ ...s, phase: 'error', error: e instanceof Error ? e.message : 'Failed to read the file.' }));
    }
  }, []);

  const runCommit = useCallback(async (outcome: ValidationOutcome) => {
    if (committingRef.current) return;
    committingRef.current = true;
    const total = outcome.stockPlan.length || outcome.createPlan.length;
    setState((s) => ({ ...s, phase: 'committing', progress: { done: 0, total } }));
    try {
      const commitResult = await commitOutcome(outcome, (done, t) => {
        setState((s) => ({ ...s, progress: { done, total: t } }));
      });
      setState((s) => ({ ...s, phase: 'done', commitResult }));
    } catch (e) {
      setState((s) => ({ ...s, phase: 'error', error: e instanceof Error ? e.message : 'Commit failed.' }));
    } finally {
      committingRef.current = false;
    }
  }, []);

  return { state, setMode, selectFile, runCommit, reset };
}
