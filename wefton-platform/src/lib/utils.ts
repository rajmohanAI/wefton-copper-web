import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BRAND } from '@/config/brand';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat(BRAND.currency.locale, {
    style: 'currency',
    currency: BRAND.currency.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '…';
}

export function getDiscountPercent(price: number, comparePrice: number): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

/**
 * Converts a stored date (Firestore Timestamp, {seconds}, ISO string,
 * epoch ms or Date) to a Date; null when missing or unreadable.
 */
export function toDate(value: unknown): Date | null {
  if (!value) return null;
  let d: Date | null = null;
  if (value instanceof Date) d = value;
  else if (typeof value === 'string' || typeof value === 'number') d = new Date(value);
  else if (typeof value === 'object') {
    const v = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof v.toDate === 'function') d = v.toDate();
    else if (typeof v.seconds === 'number') d = new Date(v.seconds * 1000);
    else if (typeof v._seconds === 'number') d = new Date(v._seconds * 1000);
  }
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WC-${timestamp}-${random}`;
}

export function debounce<T extends (...args: string[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
