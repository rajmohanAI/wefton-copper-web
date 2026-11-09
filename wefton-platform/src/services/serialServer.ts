// ============================================================
// Wefton Copper — Sticker serial masters (server only)
// The product/model list and the last piece no printed per variant live
// in Firestore and are written only through the Admin SDK. Serials are
// reserved inside a transaction, so two admins printing at the same
// moment never get the same numbers.
// ============================================================
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  DEFAULT_SERIAL_MODELS,
  nextModelId,
  planSeries,
  validateStickerRequest,
  type SerialModel,
  type StickerRequest,
  type StickerSeries,
} from '@/lib/serialgen';
import { CatalogError, getColors } from '@/services/catalogServer';

const MODELS_DOC = 'settings/serialModels';
const COUNTERS_DOC = 'counters/serials';

/** Most serial lines one PDF may hold, to keep a request bounded. */
export const MAX_REQUEST_LINES = 200;
export const MAX_REQUEST_SERIALS = 5000;

export async function getSerialModels(db: Firestore): Promise<SerialModel[]> {
  const snap = await db.doc(MODELS_DOC).get();
  const models = snap.exists ? (snap.get('models') as SerialModel[] | undefined) : undefined;
  return models?.length ? models : DEFAULT_SERIAL_MODELS;
}

/** Adds a product/model with the next id (P02, P03…); returns the full list. */
export async function addSerialModel(db: Firestore, name: string): Promise<SerialModel[]> {
  const cleanName = name.replace(/\s+/g, ' ').trim();
  if (!cleanName || cleanName.length > 120) throw new CatalogError(400, 'Model name must be 1–120 characters');

  const ref = db.doc(MODELS_DOC);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const stored = snap.exists ? (snap.get('models') as SerialModel[] | undefined) : undefined;
    const models = stored?.length ? stored : DEFAULT_SERIAL_MODELS;
    if (models.some((m) => m.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new CatalogError(409, `"${cleanName}" is already in the product list`);
    }
    const id = nextModelId(models);
    if (Number(id.slice(1)) > 99) throw new CatalogError(409, 'The product list is full (P99)');
    const next = [...models, { id, name: cleanName }];
    tx.set(ref, { models: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });
}

/** Last piece no printed per variant prefix (e.g. WCP01M0103 → 20). */
export async function getLastPrinted(db: Firestore): Promise<Record<string, number>> {
  const snap = await db.doc(COUNTERS_DOC).get();
  return (snap.exists ? (snap.get('last') as Record<string, number> | undefined) : undefined) ?? {};
}

/**
 * Validates the requests, then reserves their serial ranges, carrying on
 * from the last piece no printed for each variant.
 */
export async function reserveSeries(db: Firestore, requests: Partial<StickerRequest>[]): Promise<StickerSeries[]> {
  if (!Array.isArray(requests) || !requests.length) throw new CatalogError(400, 'Add at least one line.');
  if (requests.length > MAX_REQUEST_LINES) throw new CatalogError(400, `At most ${MAX_REQUEST_LINES} lines per PDF.`);

  const [models, colors] = await Promise.all([getSerialModels(db), getColors(db)]);
  const colorCodes = colors.map((c) => c.code);
  const resolved = requests.map((r, i) => {
    const error = validateStickerRequest(r, models, colorCodes);
    if (error) throw new CatalogError(400, `Line ${i + 1}: ${error}`);
    const req = r as StickerRequest;
    return { ...req, colorName: colors.find((c) => c.code === req.colorCode)!.name };
  });
  const total = resolved.reduce((n, r) => n + r.quantity, 0);
  if (total > MAX_REQUEST_SERIALS) {
    throw new CatalogError(400, `This would print ${total} serials; the limit per PDF is ${MAX_REQUEST_SERIALS}.`);
  }

  const ref = db.doc(COUNTERS_DOC);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const lastPrinted = (snap.exists ? (snap.get('last') as Record<string, number> | undefined) : undefined) ?? {};
    let plan: ReturnType<typeof planSeries>;
    try {
      plan = planSeries(resolved, lastPrinted);
    } catch (e) {
      throw new CatalogError(409, e instanceof Error ? e.message : 'Serial range is full');
    }
    const updates: Record<string, number> = {};
    for (const s of plan.series) updates[s.prefix] = plan.last[s.prefix];
    tx.set(ref, { last: updates, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return plan.series;
  });
}
