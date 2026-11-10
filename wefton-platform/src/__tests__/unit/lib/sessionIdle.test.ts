// ============================================================
// Wefton Copper — Inactivity sign-out
// ============================================================
import { describe, expect, it } from 'vitest';
import { SESSION_IDLE_MS, SESSION_WARNING_MS, sessionState } from '@/lib/sessionIdle';

const MIN = 60_000;

describe('inactivity sign-out', () => {
  it('signs out after 10 minutes', () => {
    expect(SESSION_IDLE_MS).toBe(10 * MIN);
    expect(sessionState(0, 10 * MIN).kind).toBe('expired');
    expect(sessionState(0, 3 * 60 * MIN).kind).toBe('expired');
  });

  it('stays active before the last minute', () => {
    expect(sessionState(0, 0)).toEqual({ kind: 'active' });
    expect(sessionState(0, 9 * MIN - 1)).toEqual({ kind: 'active' });
  });

  it('warns in the last minute with the seconds left', () => {
    expect(SESSION_WARNING_MS).toBe(MIN);
    expect(sessionState(0, 9 * MIN)).toEqual({ kind: 'warning', secondsLeft: 60 });
    expect(sessionState(0, 10 * MIN - 1500)).toEqual({ kind: 'warning', secondsLeft: 2 });
  });
});
