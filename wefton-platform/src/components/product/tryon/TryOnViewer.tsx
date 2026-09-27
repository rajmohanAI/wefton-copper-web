'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCw, Info, AlertTriangle } from 'lucide-react';
import type { TryOnResult } from '@/services/tryon/types';

interface Props {
  result: TryOnResult;
}

export default function TryOnViewer({ result }: Props) {
  const [frame, setFrame] = useState(0);
  const [spinning, setSpinning] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const frames = result.frames.length > 0 ? result.frames : [result.primaryFrame];

  // Auto-cycle frames to approximate a 360° sway.
  useEffect(() => {
    if (!spinning || frames.length < 2) return;
    timerRef.current = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 140);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [spinning, frames.length]);

  return (
    <div className="space-y-3">
      {!result.landmarksFound && (
        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          We couldn&apos;t clearly detect a body in your photo, so this is just your photo. For a better result, try a clear, front-facing, upper-body photo against a plain background.
        </p>
      )}

      <div className="relative mx-auto max-w-[280px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frames[frame]}
          alt="Try-on preview"
          className="w-full rounded-lg border border-white/10 bg-[var(--bg-darker)] object-contain"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {frames.length > 1 && (
          <button
            onClick={() => setSpinning((s) => !s)}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--copper-light)] hover:text-[var(--copper-main)] transition-colors"
          >
            <RotateCw size={13} className={spinning ? 'animate-spin' : ''} />
            {spinning ? 'Pause rotation' : 'Rotate'}
          </button>
        )}
        {frames.length > 1 && !spinning && (
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={frame}
            onChange={(e) => setFrame(Number(e.target.value))}
            className="w-32 accent-[var(--copper-main)]"
            aria-label="Rotate preview"
          />
        )}
      </div>

      <p className="text-[10px] text-[var(--text-faint)] flex items-start gap-1.5 justify-center text-center px-4">
        <Info size={11} className="mt-0.5 flex-shrink-0" /> {result.note}
      </p>
    </div>
  );
}
