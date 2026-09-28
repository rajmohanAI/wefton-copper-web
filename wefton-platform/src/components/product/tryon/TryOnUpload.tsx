'use client';

import { useRef } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import Input from '@/components/ui/Input';
import {
  TRYON_ACCEPTED_TYPES,
  TRYON_MAX_FILE_BYTES,
  TRYON_MIN_HEIGHT_CM,
  TRYON_MAX_HEIGHT_CM,
} from '@/config/tryon';
import { SIZES } from '@/config/brand';

interface Props {
  photoUrl: string | null;
  onSelectFile: (file: File) => void;
  onRemovePhoto: () => void;
  height: string;
  onHeightChange: (v: string) => void;
  size: string;
  onSizeChange: (v: string) => void;
  error: string;
  onError: (msg: string) => void;
}

export default function TryOnUpload({
  photoUrl,
  onSelectFile,
  onRemovePhoto,
  height,
  onHeightChange,
  size,
  onSizeChange,
  error,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!(TRYON_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      onError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > TRYON_MAX_FILE_BYTES) {
      onError('That image is too large. Please keep it under 8 MB.');
      return;
    }
    onError('');
    onSelectFile(file);
  };

  return (
    <div className="space-y-5">
      {/* Photo upload / preview */}
      {photoUrl ? (
        <div className="relative w-full max-w-[220px] mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Your uploaded photo" className="w-full rounded-lg border border-white/10 object-cover" />
          <button
            onClick={onRemovePhoto}
            className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-red-600/80 transition-colors"
            aria-label="Remove photo"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 border border-dashed border-white/20 rounded-lg cursor-pointer hover:border-[var(--copper-main)]/50 transition-colors">
          <Upload size={20} className="text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-muted)]">Upload a clear, front-facing photo</span>
          <span className="text-[10px] text-[var(--text-faint)]">JPEG, PNG, or WebP — max 8 MB. Best results: upper body, plain background.</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            className="hidden"
          />
        </label>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-start gap-2">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
        </p>
      )}

      {/* Height + size */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={`Height (cm)`}
          type="number"
          value={height}
          onChange={(e) => onHeightChange(e.target.value)}
          min={TRYON_MIN_HEIGHT_CM}
          max={TRYON_MAX_HEIGHT_CM}
          placeholder="170"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]">Size</label>
          <select
            value={size}
            onChange={(e) => onSizeChange(e.target.value)}
            className="h-11 bg-white/5 border border-white/10 rounded text-[var(--text-light)] text-sm px-3 focus:outline-none focus:border-[var(--copper-main)]"
          >
            <option value="" className="bg-[var(--bg-dark)]">Select</option>
            {SIZES.map((s) => (
              <option key={s} value={s} className="bg-[var(--bg-dark)]">{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
