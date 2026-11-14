import { describe, expect, it } from 'vitest';
import { applyStockMoves, matchVariantIndex, planStockMoves, type StockedProduct } from '@/lib/orderStock';
import type { OrderItem, ProductVariant } from '@/types';

const variants: ProductVariant[] = [
  { variantId: 'tb-s', size: 'S', color: 'Teal Blue', inventory: 10 },
  { variantId: 'tb-m', size: 'M', color: 'Teal Blue', inventory: 10 },
  { variantId: 'bk-m', size: 'M', color: 'Black', inventory: 10 },
];
const line = (extra: Partial<OrderItem>): OrderItem => ({ productId: 'p1', title: 'Tee', image: '', price: 689, quantity: 1, ...extra });
const catalog = () => new Map<string, StockedProduct>([['p1', { inventory: 30, variants: variants.map((v) => ({ ...v })) }]]);

describe('matchVariantIndex', () => {
  it('prefers the variantId, then size and colour', () => {
    expect(matchVariantIndex(variants, { variantId: 'bk-m' })).toBe(2);
    expect(matchVariantIndex(variants, { size: 'm', color: 'teal blue ' })).toBe(1);
    expect(matchVariantIndex(variants, { variantId: 'gone', size: 'M', color: 'Black' })).toBe(2);
  });
  it('matches a colourless line only when the size is unambiguous', () => {
    expect(matchVariantIndex(variants, { size: 'S' })).toBe(0);
    expect(matchVariantIndex(variants, { size: 'M' })).toBe(-1);
    expect(matchVariantIndex(variants, { size: 'XL', color: 'Black' })).toBe(-1);
  });
});

describe('stock moves', () => {
  it('takes stock from only the ordered colour and size, and from the total', () => {
    const products = catalog();
    const moves = planStockMoves([line({ size: 'M', color: 'Teal Blue', quantity: 2 }), line({ size: 'M', color: 'Black' })], products);
    const { updates, shortfalls } = applyStockMoves(moves, products, -1);
    const p = updates.get('p1')!;
    expect(p.inventory).toBe(27);
    expect(p.variants.map((v) => v.inventory)).toEqual([10, 8, 9]);
    expect(shortfalls).toEqual([]);
    // The catalog objects are left untouched.
    expect(products.get('p1')!.variants!.map((v) => v.inventory)).toEqual([10, 10, 10]);
  });

  it('puts the same stock back on cancellation', () => {
    const products = catalog();
    const moves = planStockMoves([line({ variantId: 'tb-s', size: 'S', color: 'Teal Blue', quantity: 3 })], products);
    const taken = applyStockMoves(moves, products, -1).updates;
    const back = applyStockMoves(moves, taken, 1).updates.get('p1')!;
    expect(back.inventory).toBe(30);
    expect(back.variants.map((v) => v.inventory)).toEqual([10, 10, 10]);
  });

  it('never goes below zero and reports the shortfall', () => {
    const products = new Map<string, StockedProduct>([['p1', { inventory: 1, variants: [{ variantId: 'a', size: 'L', color: 'Black', inventory: 1 }] }]]);
    const moves = planStockMoves([line({ size: 'L', color: 'Black', quantity: 2 })], products);
    const { updates, shortfalls } = applyStockMoves(moves, products, -1);
    expect(updates.get('p1')!.inventory).toBe(0);
    expect(updates.get('p1')!.variants[0].inventory).toBe(0);
    expect(shortfalls.length).toBe(1);
  });

  it('handles products without variants and skips deleted products', () => {
    const products = new Map<string, StockedProduct>([['p2', { inventory: 5 }]]);
    const moves = planStockMoves([line({ productId: 'p2', quantity: 2 }), line({ productId: 'gone' })], products);
    expect(moves).toHaveLength(1);
    expect(applyStockMoves(moves, products, -1).updates.get('p2')!.inventory).toBe(3);
  });
});
