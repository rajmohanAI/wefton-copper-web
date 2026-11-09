'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Barcode } from 'lucide-react';
import { fetchSerialCatalog, type SerialCatalog } from '@/services/serialgenService';
import CustomRangeForm from './CustomRangeForm';
import StickerBatch from './StickerBatch';
import StickerExcelUpload from './StickerExcelUpload';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)] mb-3">{children}</h2>;
}

export default function SerialGenClient() {
  const [catalog, setCatalog] = useState<SerialCatalog | null>(null);
  const [error, setError] = useState('');

  // Reloaded after every print so "next serial" reflects what was just used.
  const refresh = useCallback(() => {
    fetchSerialCatalog()
      .then(setCatalog)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load products.'));
  }, []);

  useEffect(refresh, [refresh]);

  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)] p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-light text-[var(--copper-light)] mb-2 flex items-center gap-2">
            <Barcode size={28} /> Serial / Barcode Generator
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Product stickers are 5.5 × 3.3 cm, three copies of each serial per row on A4. Serials look like
            WCP01M0103000001 (product, gender, colour, size, piece no) and carry on from the last one printed for
            that variant, so no number is printed twice.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </p>
        )}

        {catalog ? (
          <>
            <section>
              <SectionTitle>Build a batch</SectionTitle>
              <StickerBatch catalog={catalog} onCatalogChange={setCatalog} onPrinted={refresh} />
            </section>
            <section>
              <SectionTitle>Or upload an Excel file</SectionTitle>
              <StickerExcelUpload catalog={catalog} onPrinted={refresh} />
            </section>
          </>
        ) : (
          !error && <p className="text-sm text-[var(--text-muted)]">Loading products…</p>
        )}

        <details>
          <summary className="cursor-pointer text-xs font-medium tracking-wider uppercase text-[var(--text-muted)] mb-3">
            Custom range (any prefix, one copy each)
          </summary>
          <CustomRangeForm />
        </details>
      </div>
    </div>
  );
}
