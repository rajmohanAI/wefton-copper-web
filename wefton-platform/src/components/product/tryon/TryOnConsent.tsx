'use client';

import { ShieldCheck } from 'lucide-react';
import { TRYON_TERMS, TRYON_CONSENT_LABEL } from '@/lib/tryOnTerms';

interface Props {
  accepted: boolean;
  onAcceptedChange: (v: boolean) => void;
}

export default function TryOnConsent({ accepted, onAcceptedChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[var(--text-light)]">
        <ShieldCheck size={18} className="text-[var(--copper-light)]" />
        <h3 className="text-sm font-medium tracking-wider uppercase">Before you start</h3>
      </div>

      <div className="max-h-[38vh] overflow-y-auto rounded border border-white/10 bg-black/20 p-4 space-y-4">
        {TRYON_TERMS.map((clause) => (
          <div key={clause.title}>
            <p className="text-sm text-[var(--copper-light)] mb-1">{clause.title}</p>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{clause.body}</p>
          </div>
        ))}
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-[var(--copper-main)] focus:ring-[var(--copper-main)] flex-shrink-0"
        />
        <span className="text-xs text-[var(--text-muted)] leading-relaxed">{TRYON_CONSENT_LABEL}</span>
      </label>
    </div>
  );
}
