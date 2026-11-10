'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock, LogOut, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/services/authService';
import { useUIStore } from '@/store/uiStore';
import { readLastActivity, sessionState, writeLastActivity, SESSION_IDLE_MS } from '@/lib/sessionIdle';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel', 'mousemove'] as const;
/** How often activity is written to storage, and how often the clock is checked. */
const WRITE_EVERY_MS = 10_000;
const CHECK_EVERY_MS = 5_000;
const IDLE_MINUTES = SESSION_IDLE_MS / 60_000;

/**
 * Signs a shopper out after 10 minutes without activity, with a warning in
 * the last minute. Browsing never needs a sign-in; checkout and the account
 * page do, so they ask again after this.
 */
export default function SessionTimeout() {
  const { user, loading } = useAuth();
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const lastWrite = useRef(0);
  const ending = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Nobody signed in: forget the clock so the next sign-in starts fresh.
      writeLastActivity(null);
      setSecondsLeft(null);
      return;
    }

    ending.current = false;
    const end = async () => {
      if (ending.current) return;
      ending.current = true;
      writeLastActivity(null);
      setSecondsLeft(null);
      setSignedOut(true);
      await logout().catch((e) => console.error('[Wefton Auth] Inactivity sign-out failed:', e));
    };

    const check = () => {
      const last = readLastActivity();
      if (last === null) {
        writeLastActivity(Date.now());
        return;
      }
      const state = sessionState(last, Date.now());
      if (state.kind === 'expired') end();
      else setSecondsLeft(state.kind === 'warning' ? state.secondsLeft : null);
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite.current < WRITE_EVERY_MS) return;
      // An expired session must not be revived by the first click after it.
      const last = readLastActivity();
      if (last !== null && sessionState(last, now).kind === 'expired') {
        end();
        return;
      }
      lastWrite.current = now;
      writeLastActivity(now);
      setSecondsLeft(null);
    };

    // A session restored after a long gap (closed browser) ends straight away.
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === 'visible' && check();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, loading]);

  const staySignedIn = () => {
    lastWrite.current = Date.now();
    writeLastActivity(lastWrite.current);
    setSecondsLeft(null);
  };

  if (user && secondsLeft !== null) {
    return (
      <div role="alertdialog" aria-live="assertive" className={BAR}>
        <Clock size={16} className="text-[var(--copper-light)] flex-shrink-0" />
        <p className="flex-1">
          For your security, you’ll be signed out in <strong>{secondsLeft}s</strong> because of inactivity.
        </p>
        <button onClick={staySignedIn} className={BUTTON}>
          Stay signed in
        </button>
      </div>
    );
  }

  if (signedOut && !user) {
    return (
      <div role="status" className={BAR}>
        <LogOut size={16} className="text-[var(--copper-light)] flex-shrink-0" />
        <p className="flex-1">You were signed out after {IDLE_MINUTES} minutes of inactivity.</p>
        <button
          onClick={() => {
            setSignedOut(false);
            openAuthModal();
          }}
          className={BUTTON}
        >
          Sign in
        </button>
        <button onClick={() => setSignedOut(false)} aria-label="Dismiss" className="text-[var(--text-muted)] hover:text-[var(--text-light)]">
          <X size={16} />
        </button>
      </div>
    );
  }

  return null;
}

const BAR =
  'fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-lg flex items-center gap-3 rounded-lg border border-[var(--glass-border)] glass px-4 py-3 text-sm text-[var(--text-light)] shadow-xl';
const BUTTON =
  'flex-shrink-0 rounded bg-[var(--copper-main)] px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-white hover:bg-[var(--copper-dark)]';
