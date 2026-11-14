// ============================================================
// Wefton Copper — Order stock moves (pure, shared by server and admin)
// When an order is placed, each line takes stock from the variant with the
// ordered colour and size, and the product's total stock drops by the same
// amount. A cancelled order puts the same quantities back. The order keeps a
// record of what it took (stockMoves), so this happens once and is undone
// exactly. Firestore reads and writes live in the callers.
// ============================================================
import type { OrderItem, ProductVariant } from '@/types';

export interface StockedProduct {
  inventory?: number;
  variants?: ProductVariant[];
}

/** One line's stock taken by an order; stored on the order as stockMoves. */
export interface StockMove {
  productId: string;
  /** The variant the stock came from; '' when the product has no matching variant. */
  variantId: string;
  size: string;
  color: string;
  quantity: number;
}

export interface StockChange {
  /** New stock fields per product id, ready to write. */
  updates: Map<string, { inventory: number; variants: ProductVariant[] }>;
  /** Lines that asked for more than was in stock (stock stops at 0). */
  shortfalls: string[];
}

const norm = (s: string | undefined) => (s || '').trim().toLowerCase();

/**
 * The variant an order line was bought as: by variantId when the line has
 * one, otherwise by size and colour. -1 when nothing matches.
 */
export function matchVariantIndex(variants: ProductVariant[], line: { variantId?: string; size?: string; color?: string }): number {
  if (line.variantId) {
    const byId = variants.findIndex((v) => v.variantId === line.variantId);
    if (byId >= 0) return byId;
  }
  const size = norm(line.size);
  const color = norm(line.color);
  const exact = variants.findIndex((v) => norm(v.size) === size && norm(v.color) === color);
  if (exact >= 0) return exact;
  // A line saved without a colour still matches when only one variant has that size.
  if (!color) {
    const sameSize = variants.filter((v) => norm(v.size) === size);
    if (sameSize.length === 1) return variants.indexOf(sameSize[0]);
  }
  return -1;
}

/** Resolves an order's lines to the variants they take stock from. */
export function planStockMoves(items: OrderItem[], products: Map<string, StockedProduct>): StockMove[] {
  const moves: StockMove[] = [];
  for (const item of items) {
    const quantity = Number(item.quantity) || 0;
    if (!item.productId || quantity <= 0) continue;
    const product = products.get(item.productId);
    if (!product) continue; // deleted from the catalog: nothing to take
    const variants = product.variants || [];
    const index = matchVariantIndex(variants, item);
    moves.push({
      productId: item.productId,
      variantId: index >= 0 ? variants[index].variantId || '' : '',
      size: item.size || '',
      color: item.color || '',
      quantity,
    });
  }
  return moves;
}

/**
 * Applies stock moves to the products: direction -1 takes stock (order
 * placed), +1 puts it back (order cancelled). Stock never goes below 0.
 */
export function applyStockMoves(
  moves: StockMove[],
  products: Map<string, StockedProduct>,
  direction: -1 | 1
): StockChange {
  const updates: StockChange['updates'] = new Map();
  const shortfalls: string[] = [];

  for (const move of moves) {
    const product = products.get(move.productId);
    if (!product) continue;
    const current = updates.get(move.productId) ?? {
      inventory: Number(product.inventory) || 0,
      variants: (product.variants || []).map((v) => ({ ...v })),
    };
    const delta = direction * move.quantity;

    const index = move.variantId
      ? current.variants.findIndex((v) => v.variantId === move.variantId)
      : matchVariantIndex(current.variants, move);
    if (index >= 0) {
      const variant = current.variants[index];
      const before = Number(variant.inventory) || 0;
      if (before + delta < 0) shortfalls.push(`${move.productId} ${move.color} ${move.size}`.trim());
      current.variants[index] = { ...variant, inventory: Math.max(0, before + delta) };
    }
    if (current.inventory + delta < 0 && index < 0) shortfalls.push(move.productId);
    current.inventory = Math.max(0, current.inventory + delta);
    updates.set(move.productId, current);
  }
  return { updates, shortfalls };
}
