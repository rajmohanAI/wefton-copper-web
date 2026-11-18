'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { MessageCircle, X } from 'lucide-react';
import { WHEEZ_NAME } from '@/lib/wheez';

// The chat loads only when someone opens it.
const WheezChat = dynamic(() => import('./WheezChat'), { ssr: false });

/** Pages where the floating button would get in the way. */
const HIDDEN_ON = ['/admin', '/serialgen', '/seed', '/checkout', '/contact'];

/** Floating Wheez button, bottom right (WC-Issue-13). */
export default function WheezLauncher() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label={`${WHEEZ_NAME} support chat`}
          className="fixed z-40 bottom-20 right-4 left-4 sm:left-auto sm:w-[360px] h-[min(540px,calc(100dvh-var(--nav-height)-6rem))] flex flex-col rounded-xl border border-[var(--glass-border)] bg-[var(--bg-darker)] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--copper-light)]">{WHEEZ_NAME}</p>
              <p className="text-[11px] text-[var(--text-faint)]">Wefton Copper support</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="text-[var(--text-muted)] hover:text-[var(--text-light)]">
              <X size={18} />
            </button>
          </div>
          <WheezChat className="flex-1" />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? `Close ${WHEEZ_NAME}` : `Chat with ${WHEEZ_NAME}`}
        aria-expanded={open}
        className="fixed z-40 bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-copper)] bg-[var(--bg-darker)] text-[var(--copper-light)] shadow-lg transition-colors hover:bg-[var(--copper-main)]/15"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}
