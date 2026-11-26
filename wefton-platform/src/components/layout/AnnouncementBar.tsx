'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ANNOUNCEMENTS } from '@/config/brand';

const ROTATE_MS = 5000;

/**
 * Slim, static announcement line above the menu (WC-Issue-36).
 * Deliberately not a scrolling ticker: one calm line suits a premium brand.
 * With more than one message it fades between them, and stays on the first
 * one for visitors who prefer reduced motion. It folds away once the page
 * scrolls, so the sticky menu stays compact.
 */
export default function AnnouncementBar({ hidden }: { hidden: boolean }) {
  const messages = ANNOUNCEMENTS;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % messages.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div
      aria-hidden={hidden || undefined}
      className={cn(
        'overflow-hidden transition-all duration-500',
        hidden ? 'max-h-0 opacity-0' : '-mt-7 mb-3 max-h-10 opacity-100'
      )}
    >
      <div className="relative h-7 bg-[#1f1612] text-[#d68f64]">
        {messages.map((text, i) => (
          <p
            key={text}
            aria-hidden={i !== index || undefined}
            className={cn(
              'absolute inset-0 flex items-center justify-center px-4 text-center text-[11px] tracking-[0.2em] uppercase transition-opacity duration-700',
              i === index ? 'opacity-100' : 'opacity-0'
            )}
          >
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}
