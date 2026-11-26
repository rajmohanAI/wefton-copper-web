// ============================================================
// Wefton Copper — where a visitor came from (MRD-01)
// On landing, the campaign tags in the link (utm_*, gclid, fbclid), the
// referring site and the landing page are kept in sessionStorage for this
// visit. They are saved on a sign-up or an order only when the visitor
// has allowed analytics cookies (see consent.ts).
// ============================================================
import { hasAnalyticsConsent } from './consent';

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  /** Host of the referring site, e.g. "l.instagram.com". */
  referrer?: string;
  /** Path of the first page of the visit, e.g. "/men". */
  landingPage?: string;
  /** ISO time of landing. */
  landedAt?: string;
}

export const ATTRIBUTION_KEY = 'wc-attribution';
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'] as const;
const MAX_LEN = 150;

function clean(value: string | null | undefined): string | undefined {
  const v = (value ?? '').trim().slice(0, MAX_LEN);
  return v || undefined;
}

/**
 * Builds the record for a landing. Returns null for an internal page
 * change (no campaign tags and the referrer is our own site).
 */
export function parseLanding(href: string, referrer: string, now = new Date()): Attribution | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const record: Attribution = {};
  for (const key of PARAMS) {
    const v = clean(url.searchParams.get(key));
    if (v) record[key] = v;
  }
  let refHost: string | undefined;
  try {
    refHost = referrer ? new URL(referrer).hostname : undefined;
  } catch {
    refHost = undefined;
  }
  const internal = refHost !== undefined && refHost.replace(/^www\./, '') === url.hostname.replace(/^www\./, '');
  const hasTags = PARAMS.some((k) => record[k]);
  if (!hasTags && internal) return null;
  if (refHost && !internal) record.referrer = clean(refHost);
  record.landingPage = clean(url.pathname) ?? '/';
  record.landedAt = now.toISOString();
  return record;
}

/**
 * Remembers this visit's source. The first landing of a visit wins, unless
 * a later link carries campaign tags (then that newer campaign wins).
 */
export function captureLanding(): void {
  if (typeof window === 'undefined') return;
  const record = parseLanding(window.location.href, document.referrer);
  if (!record) return;
  try {
    const existing = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    const tagged = PARAMS.some((k) => record[k]);
    if (existing && !tagged) return;
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(record));
  } catch {
    // Storage blocked: nothing to remember.
  }
}

/** This visit's source, for saving on a sign-up or order. Null without consent. */
export function attributionForSave(): Attribution | null {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return null;
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return sanitizeAttribution(parsed);
  } catch {
    return null;
  }
}

/** Keeps only known string fields, trimmed. Used on the server too. */
export function sanitizeAttribution(input: unknown): Attribution | null {
  if (!input || typeof input !== 'object') return null;
  const src = input as Record<string, unknown>;
  const out: Attribution = {};
  const keys = [...PARAMS, 'referrer', 'landingPage', 'landedAt'] as const;
  for (const key of keys) {
    const v = typeof src[key] === 'string' ? clean(src[key] as string) : undefined;
    if (v) out[key] = v;
  }
  return Object.keys(out).length ? out : null;
}
