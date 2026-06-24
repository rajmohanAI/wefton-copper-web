// ============================================================
// Wefton Copper — Inventory Service (atomic stock management)
// ============================================================

import { runTransaction, doc, writeBatch, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { OrderItem } from '@/types';

export interface InventoryResult {
  success: boolean;
  error?: string;
  failedVariantId?: string;
}

/**
 * Atomically decrements inventory for all items in an order.
 * Uses a Firestore transaction to ensure consistency.
 * Aborts the entire transaction if any variant has insufficient stock.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.5
 */
export async function decrementInventory(
  items: OrderItem[]
): Promise<InventoryResult> {
  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Firebase not configured' };

  try {
    await runTransaction(db, async (transaction) => {
      // Read all product docs first (required by Firestore transaction rules)
      const productReads = await Promise.all(
        items.map(async (item) => {
          const ref = doc(db, 'products', item.productId);
          const snap = await transaction.get(ref);
          return { item, ref, snap };
        })
      );

      // Validate stock availability for all items
      for (const { item, snap } of productReads) {
        if (!snap.exists()) {
          throw new Error(`Product ${item.productId} not found`);
        }
        const data = snap.data();
        const variants = data.variants || [];
        const variant = variants.find(
          (v: { variantId?: string; size?: string; color?: string }) =>
            (item.size && v.size === item.size) ||
            (v.variantId && v.variantId === item.productId)
        );
        const currentStock = variant?.inventory ?? data.inventory ?? 0;
        if (currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock for ${item.title} (available: ${currentStock}, requested: ${item.quantity})`
          );
        }
      }

      // Apply decrements
      for (const { item, ref, snap } of productReads) {
        const data = snap.data()!;
        const variants = (data.variants || []).map(
          (v: { size?: string; inventory: number }) => {
            if (v.size === item.size) {
              return { ...v, inventory: v.inventory - item.quantity };
            }
            return v;
          }
        );
        const newTotalInventory = (data.inventory ?? 0) - item.quantity;
        transaction.update(ref, { variants, inventory: newTotalInventory });
      }
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Increments inventory for items being returned/refunded.
 * Uses a Firestore writeBatch to restore variant stock by the returned quantity.
 *
 * Requirements: 11.5
 */
export async function incrementInventory(
  items: { productId: string; variantId: string; size?: string; quantity: number }[]
): Promise<InventoryResult> {
  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Firebase not configured' };

  try {
    const batch = writeBatch(db);

    for (const item of items) {
      const ref = doc(db, 'products', item.productId);
      const snap = await getDoc(ref);
      if (!snap.exists()) continue;

      const data = snap.data();
      const variants = (data.variants || []).map(
        (v: { size?: string; inventory: number }) => {
          if (v.size === item.size) {
            return { ...v, inventory: v.inventory + item.quantity };
          }
          return v;
        }
      );
      const newTotal = (data.inventory ?? 0) + item.quantity;
      batch.update(ref, { variants, inventory: newTotal });
    }

    await batch.commit();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
