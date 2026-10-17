// ============================================================
// Wefton Copper — Catalog masters (server only)
// Colour list and per-gender Product ID counters live in Firestore and
// are written only through the Admin SDK, inside transactions, so two
// admins saving at the same moment never get the same number.
// ============================================================
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  DEFAULT_COLORS,
  GENDER_LETTER,
  MAX_PRODUCT_NUMBER,
  findColor,
  formatProductCode,
  nextColorCode,
  parseProductCode,
  type CatalogColor,
  type Gender,
} from '@/lib/productCodes';

const COLORS_DOC = 'settings/colors';
const COUNTERS_DOC = 'counters/productCodes';

export class CatalogError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'CatalogError';
  }
}

export async function getColors(db: Firestore): Promise<CatalogColor[]> {
  const snap = await db.doc(COLORS_DOC).get();
  const colors = snap.exists ? (snap.get('colors') as CatalogColor[] | undefined) : undefined;
  return colors?.length ? colors : DEFAULT_COLORS;
}

/** Adds a colour with the next colour number; returns the full list. */
export async function addColor(db: Firestore, name: string, hex: string): Promise<CatalogColor[]> {
  const cleanName = name.replace(/\s+/g, ' ').trim();
  if (!cleanName || cleanName.length > 40) throw new CatalogError(400, 'Colour name must be 1–40 characters');
  const cleanHex = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : '#000000';

  const ref = db.doc(COLORS_DOC);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const stored = snap.exists ? (snap.get('colors') as CatalogColor[] | undefined) : undefined;
    const colors = stored?.length ? stored : DEFAULT_COLORS;
    if (findColor(colors, cleanName)) throw new CatalogError(409, `"${cleanName}" is already in the colour list`);
    const code = nextColorCode(colors);
    if (parseInt(code, 10) > 99) throw new CatalogError(409, 'The colour list is full (99 colours)');
    const next = [...colors, { name: cleanName, code, hex: cleanHex }];
    tx.set(ref, { colors: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });
}

/**
 * Reserves `count` consecutive Product IDs for one gender. The counter
 * starts from the highest existing code of that gender the first time.
 */
export async function allocateProductCodes(db: Firestore, gender: Gender, count: number): Promise<string[]> {
  if (!Number.isInteger(count) || count < 1 || count > 500) throw new CatalogError(400, 'Invalid count');
  const letter = GENDER_LETTER[gender];
  const ref = db.doc(COUNTERS_DOC);

  // Highest code already on a product, read before the transaction so the
  // first allocation never reuses a number assigned before counters existed.
  const existing = await db.collection('products').where('productCode', '>=', `WCP${letter}000`).where('productCode', '<=', `WCP${letter}999`).get();
  const existingMax = existing.docs.reduce((m, d) => Math.max(m, parseProductCode(d.get('productCode'))?.number ?? 0), 0);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = Math.max((snap.exists ? Number(snap.get(letter)) : 0) || 0, existingMax);
    if (current + count > MAX_PRODUCT_NUMBER) {
      throw new CatalogError(409, `Product IDs for this gender would pass ${MAX_PRODUCT_NUMBER}`);
    }
    tx.set(ref, { [letter]: current + count, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return Array.from({ length: count }, (_, i) => formatProductCode(gender, current + i + 1));
  });
}

/** Gives every product without a Product ID one, oldest product first. */
export async function assignMissingProductCodes(db: Firestore): Promise<number> {
  const snap = await db.collection('products').orderBy('createdAt', 'asc').get();
  const missing = snap.docs.filter((d) => !parseProductCode(d.get('productCode')));
  const byGender = new Map<Gender, typeof missing>();
  for (const d of missing) {
    const g = d.get('gender') as Gender;
    if (!(g in GENDER_LETTER)) continue;
    byGender.set(g, [...(byGender.get(g) ?? []), d]);
  }

  let assigned = 0;
  for (const [gender, docs] of byGender) {
    const codes = await allocateProductCodes(db, gender, docs.length);
    const batch = db.batch();
    docs.forEach((d, i) => {
      batch.update(d.ref, { productCode: codes[i], updatedAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();
    assigned += docs.length;
  }
  return assigned;
}
