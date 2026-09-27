'use client';

// ============================================================
// Wefton Copper — Ephemeral Image Lifecycle (privacy core)
// ============================================================
// Owns the user's uploaded photo and all derived result frames as IN-MEMORY
// object URLs only, and GUARANTEES they are destroyed on every exit path:
//   - component unmount (modal close)
//   - route change (e.g. navigating to checkout or any other screen)
//   - tab/window close (beforeunload / pagehide)
//   - tab hidden beyond a short grace period (visibilitychange)
//   - inactivity timeout
// Nothing is ever written to localStorage, IndexedDB, cookies, or the network.

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { TRYON_INACTIVITY_MS } from '@/config/tryon';

interface EphemeralImageState {
  /** In-memory object URL for the uploaded photo preview, or null. */
  photoUrl: string | null;
  /** The raw Blob (kept only in a ref, exposed via getPhoto). */
  hasPhoto: boolean;
}

export function useEphemeralImage() {
  const [state, setState] = useState<EphemeralImageState>({ photoUrl: null, hasPhoto: false });

  // Refs so cleanup handlers always see the latest values without re-binding.
  const photoBlobRef = useRef<Blob | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const resultUrlsRef = useRef<string[]>([]);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = usePathname();
  const initialPathRef = useRef(pathname);

  /** Revoke and forget everything. Safe to call multiple times. */
  const clear = useCallback(() => {
    if (photoUrlRef.current) {
      URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = null;
    }
    for (const url of resultUrlsRef.current) URL.revokeObjectURL(url);
    resultUrlsRef.current = [];
    photoBlobRef.current = null;
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (hiddenTimerRef.current) clearTimeout(hiddenTimerRef.current);
    // Best-effort: clear any session scratch (none is used, but be defensive).
    try { sessionStorage.removeItem('wefton-tryon'); } catch { /* ignore */ }
    setState({ photoUrl: null, hasPhoto: false });
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => clear(), TRYON_INACTIVITY_MS);
  }, [clear]);

  /** Set the uploaded photo (replaces any previous one). */
  const setPhoto = useCallback((blob: Blob) => {
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    const url = URL.createObjectURL(blob);
    photoBlobRef.current = blob;
    photoUrlRef.current = url;
    setState({ photoUrl: url, hasPhoto: true });
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const getPhoto = useCallback((): Blob | null => photoBlobRef.current, []);

  /**
   * Register result frame URLs so they are revoked on cleanup. Any previously
   * registered result URLs are revoked first.
   */
  const trackResultUrls = useCallback((urls: string[]) => {
    for (const url of resultUrlsRef.current) {
      if (!urls.includes(url)) URL.revokeObjectURL(url);
    }
    resultUrlsRef.current = [...urls];
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Wipe when the route changes (covers navigating to checkout / any screen).
  useEffect(() => {
    if (pathname !== initialPathRef.current) {
      clear();
    }
  }, [pathname, clear]);

  // Wipe on tab close and when hidden beyond a short grace period.
  useEffect(() => {
    const onExit = () => clear();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenTimerRef.current = setTimeout(() => clear(), 30_000);
      } else if (hiddenTimerRef.current) {
        clearTimeout(hiddenTimerRef.current);
        hiddenTimerRef.current = null;
      }
    };
    window.addEventListener('beforeunload', onExit);
    window.addEventListener('pagehide', onExit);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', onExit);
      window.removeEventListener('pagehide', onExit);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [clear]);

  // Wipe on unmount (modal close).
  useEffect(() => {
    return () => clear();
  }, [clear]);

  return {
    photoUrl: state.photoUrl,
    hasPhoto: state.hasPhoto,
    setPhoto,
    getPhoto,
    trackResultUrls,
    clear,
  };
}
