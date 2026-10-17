// ============================================================
// Wefton Copper — Catalog admin API calls (browser)
// Talks to /api/admin/catalog/*; the server writes the colour master and
// the Product ID counters with the Admin SDK.
// ============================================================
import { getFirebaseAuth } from '@/lib/firebase';
import type { CatalogColor, Gender } from '@/lib/productCodes';

async function request<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await getFirebaseAuth()?.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in again');
  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function fetchColors(): Promise<CatalogColor[]> {
  return (await request<{ colors: CatalogColor[] }>('/api/admin/catalog/colors')).colors;
}

export async function createColor(name: string, hex: string): Promise<CatalogColor[]> {
  return (await request<{ colors: CatalogColor[] }>('/api/admin/catalog/colors', { method: 'POST', body: { name, hex } })).colors;
}

export async function reserveProductCodes(gender: Gender, count = 1): Promise<string[]> {
  return (await request<{ codes: string[] }>('/api/admin/catalog/product-codes', { method: 'POST', body: { gender, count } })).codes;
}

export async function assignMissingProductCodes(): Promise<number> {
  return (await request<{ assigned: number }>('/api/admin/catalog/assign-codes', { method: 'POST' })).assigned;
}
