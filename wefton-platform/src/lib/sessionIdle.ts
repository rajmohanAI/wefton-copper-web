// ============================================================
// Wefton Copper — Inactivity sign-out (pure logic)
// ============================================================
// A signed-in shopper is signed out after SESSION_IDLE_MS with no activity.
// The last activity time is shared through localStorage, so every open tab
// counts, and a session left idle while the browser was closed ends on the
// next visit.

export const SESSION_IDLE_MS = 10 * 60 * 1000;
/** The warning shows this long before the sign-out. */
export const SESSION_WARNING_MS = 60 * 1000;
export const LAST_ACTIVITY_KEY = 'wefton.lastActivity';

export type SessionState = { kind: 'active' } | { kind: 'warning'; secondsLeft: number } | { kind: 'expired' };

/** Where a session stands, given the last activity time (ms) and now. */
export function sessionState(lastActivity: number, now: number): SessionState {
  const idle = now - lastActivity;
  if (idle >= SESSION_IDLE_MS) return { kind: 'expired' };
  if (idle >= SESSION_IDLE_MS - SESSION_WARNING_MS) {
    return { kind: 'warning', secondsLeft: Math.ceil((SESSION_IDLE_MS - idle) / 1000) };
  }
  return { kind: 'active' };
}

export function readLastActivity(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeLastActivity(time: number | null) {
  try {
    if (time === null) localStorage.removeItem(LAST_ACTIVITY_KEY);
    else localStorage.setItem(LAST_ACTIVITY_KEY, String(time));
  } catch {
    /* storage unavailable: the timer still runs in this tab */
  }
}
