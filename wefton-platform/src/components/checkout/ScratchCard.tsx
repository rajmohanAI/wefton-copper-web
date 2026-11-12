'use client';

// ============================================================
// Wefton Copper — Scratch card shown after an order is placed
// The customer scratches the copper foil (mouse, finger or pen) to reveal
// a coupon code for their next order, then copies it.
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Gift } from 'lucide-react';
import { fetchRewardCoupon } from '@/services/orderService';
import type { RewardCoupon } from '@/types';

/** Share of the foil that must be cleared before the rest falls away. */
const REVEAL_AT = 0.45;
const BRUSH = 22;

const formatIst = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));

function rememberScratched(code: string) {
  try {
    localStorage.setItem(`wc-scratched-${code}`, '1');
  } catch {
    /* private mode: the card just shows the foil again next time */
  }
}

function wasScratched(code: string): boolean {
  try {
    return localStorage.getItem(`wc-scratched-${code}`) === '1';
  } catch {
    return false;
  }
}

export default function ScratchCard({
  orderId,
  loadReward = fetchRewardCoupon,
}: {
  orderId: string;
  /** Where the coupon comes from; the server by default. */
  loadReward?: (orderId: string) => Promise<RewardCoupon | null>;
}) {
  const [reward, setReward] = useState<RewardCoupon | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'none' | 'error'>('loading');
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const strokes = useRef(0);

  const load = useCallback(async () => {
    try {
      const r = await loadReward(orderId);
      setReward(r);
      setStatus(r ? 'ready' : 'none');
      if (r && wasScratched(r.code)) setRevealed(true);
    } catch {
      setStatus('error');
    }
  }, [orderId, loadReward]);

  useEffect(() => {
    void load();
  }, [load]);

  // Paint the copper foil over the code.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (status !== 'ready' || revealed || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    grad.addColorStop(0, '#8a4a22');
    grad.addColorStop(0.45, '#d08a55');
    grad.addColorStop(0.55, '#e7a974');
    grad.addColorStop(1, '#9c5528');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, rect.width, rect.height);
    // A little sparkle so it reads as foil.
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 70; i++) {
      ctx.fillRect(Math.random() * rect.width, Math.random() * rect.height, 2, 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Scratch here', rect.width / 2, rect.height / 2);
  }, [status, revealed]);

  const reveal = useCallback(() => {
    setRevealed(true);
    if (reward) rememberScratched(reward.code);
  }, [reward]);

  const clearedShare = (canvas: HTMLCanvasElement): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return 1;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let clear = 0;
    let total = 0;
    // Every 16th pixel is plenty to estimate.
    for (let i = 3; i < data.length; i += 64) {
      total++;
      if (data[i] === 0) clear++;
    }
    return total ? clear / total : 1;
  };

  const scratchAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = BRUSH * 2;
    ctx.beginPath();
    ctx.moveTo((last.current ?? point).x, (last.current ?? point).y);
    ctx.lineTo(point.x + 0.1, point.y + 0.1);
    ctx.stroke();
    last.current = point;
    if (++strokes.current % 8 === 0 && clearedShare(canvas) >= REVEAL_AT) reveal();
  };

  const handleCopy = async () => {
    if (!reward) return;
    try {
      await navigator.clipboard.writeText(reward.code);
    } catch {
      // Older browsers: select the code so it can be copied by hand.
      const el = document.getElementById('scratch-code');
      if (el) window.getSelection()?.selectAllChildren(el);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'none') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65 }}
      className="bg-[var(--copper-main)]/10 border border-[var(--copper-main)]/30 rounded-lg p-5 mb-6"
      data-testid="scratch-card"
    >
      <div className="flex items-center gap-2 mb-1">
        <Gift size={16} className="text-[var(--copper-light)]" />
        <h4 className="text-xs font-medium text-[var(--text-light)] uppercase tracking-wider">
          A thank-you gift for your next order
        </h4>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        {status === 'ready' && reward
          ? <>Scratch the card to reveal a coupon for <span className="text-[var(--copper-light)] font-medium">{reward.label} off</span>.</>
          : 'Scratch the card to reveal your coupon.'}
      </p>

      {status === 'loading' && (
        <div className="h-24 rounded-lg bg-white/5 border border-white/10 animate-pulse" aria-label="Loading your scratch card" />
      )}

      {status === 'error' && (
        <div className="h-24 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          We couldn&apos;t load your scratch card.
          <button type="button" onClick={() => {
              setStatus('loading');
              void load();
            }} className="text-[var(--copper-light)] underline">
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && reward && (
        <>
          <div className="relative h-24 rounded-lg overflow-hidden bg-[var(--wc-canvas,#111)] border border-[var(--copper-main)]/40 select-none">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">Your coupon code</span>
              <span
                id="scratch-code"
                className="font-mono text-base sm:text-xl font-semibold tracking-[0.12em] text-[var(--copper-light)] break-all text-center px-3"
                aria-hidden={!revealed}
              >
                {reward.code}
              </span>
            </div>
            {!revealed && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full cursor-pointer touch-none"
                role="button"
                tabIndex={0}
                aria-label="Scratch card. Scratch it, or press Enter to reveal your coupon code."
                onPointerDown={(e) => {
                  drawing.current = true;
                  last.current = null;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  scratchAt(e);
                }}
                onPointerMove={(e) => drawing.current && scratchAt(e)}
                onPointerUp={() => {
                  drawing.current = false;
                  last.current = null;
                  if (canvasRef.current && clearedShare(canvasRef.current) >= REVEAL_AT) reveal();
                }}
                onPointerCancel={() => {
                  drawing.current = false;
                  last.current = null;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    reveal();
                  }
                }}
              />
            )}
          </div>

          {revealed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 space-y-3">
              <button
                type="button"
                onClick={handleCopy}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded bg-[var(--copper-main)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy code'}
              </button>
              <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
                Use it on a future order from {formatIst(reward.startsAt)} till {formatIst(reward.expiresAt)}.
                <br />
                One use only. Anyone you share it with can use it. It stops working if this order is cancelled.
              </p>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
