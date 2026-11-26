// ============================================================
// Minimal browser stand-in for node-environment unit tests (MRD-01):
// window (an EventTarget) with localStorage / sessionStorage / location,
// and document.referrer. Call restore() (or vi.unstubAllGlobals()) after.
// ============================================================
import { vi } from 'vitest';

export class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  throwOnAccess = false;
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    if (this.throwOnAccess) throw new Error('blocked');
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(key: string) {
    if (this.throwOnAccess) throw new Error('blocked');
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.throwOnAccess) throw new Error('blocked');
    this.map.set(key, String(value));
  }
}

export interface FakeBrowser {
  window: EventTarget & { localStorage: MemoryStorage; sessionStorage: MemoryStorage; location: { href: string } };
  document: { referrer: string };
  visit(href: string, referrer?: string): void;
}

export function fakeBrowser(href = 'https://www.weftoncopper.com/', referrer = ''): FakeBrowser {
  const target = new EventTarget() as FakeBrowser['window'];
  target.localStorage = new MemoryStorage();
  target.sessionStorage = new MemoryStorage();
  target.location = { href };
  const document = { referrer };
  vi.stubGlobal('window', target);
  vi.stubGlobal('document', document);
  return {
    window: target,
    document,
    visit(nextHref: string, nextReferrer?: string) {
      target.location.href = nextHref;
      if (nextReferrer !== undefined) document.referrer = nextReferrer;
    },
  };
}
