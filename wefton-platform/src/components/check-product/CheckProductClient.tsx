'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, BadgeCheck, SearchX } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ProductDetails {
  serial: string;
  modelId: string;
  product: string;
  color: string;
  gender: string;
  size: string;
  printedAt: string | null;
}

type Result = { found: true; product: ProductDetails } | { found: false; serial: string };

/** Serial form and result. A ?serial= link (e.g. from a QR) is checked straight away. */
export default function CheckProductClient() {
  const params = useSearchParams();
  const [serial, setSerial] = useState(params.get('serial') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const check = useCallback(async (value: string) => {
    setError('');
    setResult(null);
    if (!value.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/check-product?serial=${encodeURIComponent(value.trim())}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Something went wrong. Please try again.');
      else setResult(data.found ? { found: true, product: data.product } : { found: false, serial: value.trim().toUpperCase() });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fromLink = params.get('serial');
    if (fromLink) check(fromLink);
  }, [params, check]);

  return (
    <div className="space-y-6">
      <form
        className="glass-card p-6 flex flex-col sm:flex-row gap-3 sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          check(serial);
        }}
      >
        <div className="flex-1">
          <Input
            label="Serial number"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="WCP01M0103000001"
            autoComplete="off"
            spellCheck={false}
            className="font-mono uppercase"
          />
        </div>
        <Button type="submit" variant="copper" loading={loading} disabled={loading || !serial.trim()}>
          Check
        </Button>
      </form>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-start gap-2">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
        </p>
      )}

      {result?.found && (
        <div className="glass-card p-6 space-y-5">
          <p className="flex items-center gap-2 text-emerald-400 font-medium">
            <BadgeCheck size={20} /> Genuine Wefton Copper product
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-[var(--text-muted)]">Serial</dt>
            <dd className="font-mono text-[var(--text-light)]">{result.product.serial}</dd>
            <dt className="text-[var(--text-muted)]">Product</dt>
            <dd className="text-[var(--text-light)]">
              {result.product.product} <span className="text-[var(--text-muted)]">({result.product.modelId})</span>
            </dd>
            <dt className="text-[var(--text-muted)]">Colour</dt>
            <dd className="text-[var(--text-light)]">{result.product.color}</dd>
            <dt className="text-[var(--text-muted)]">Fit</dt>
            <dd className="text-[var(--text-light)]">{result.product.gender}</dd>
            <dt className="text-[var(--text-muted)]">Size</dt>
            <dd className="text-[var(--text-light)]">{result.product.size}</dd>
            {result.product.printedAt && (
              <>
                <dt className="text-[var(--text-muted)]">Tagged on</dt>
                <dd className="text-[var(--text-light)]">
                  {new Date(result.product.printedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </dd>
              </>
            )}
          </dl>
        </div>
      )}

      {result && !result.found && (
        <div className="glass-card p-6 space-y-2">
          <p className="flex items-center gap-2 text-amber-400 font-medium">
            <SearchX size={20} /> We couldn’t find this serial
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Check that you typed <span className="font-mono">{result.serial}</span> exactly as printed under the barcode.
            If it still isn’t found, write to{' '}
            <a href="mailto:sales@weftoncopper.com" className="text-[var(--copper-light)] hover:underline">
              sales@weftoncopper.com
            </a>{' '}
            with a photo of the tag.
          </p>
        </div>
      )}
    </div>
  );
}
