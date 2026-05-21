// ============================================================
// Wefton Copper — Wishlist Store Unit Tests
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { useWishlistStore } from '@/store/wishlistStore';

describe('wishlistStore', () => {
  beforeEach(() => {
    useWishlistStore.setState({ items: [] });
  });

  describe('toggle', () => {
    it('adds a product to wishlist', async () => {
      await useWishlistStore.getState().toggle('prod-1');
      expect(useWishlistStore.getState().items).toContain('prod-1');
    });

    it('removes a product from wishlist if already present', async () => {
      useWishlistStore.setState({ items: ['prod-1'] });
      await useWishlistStore.getState().toggle('prod-1');
      expect(useWishlistStore.getState().items).not.toContain('prod-1');
    });

    it('handles multiple products', async () => {
      await useWishlistStore.getState().toggle('prod-1');
      await useWishlistStore.getState().toggle('prod-2');
      expect(useWishlistStore.getState().items).toEqual(['prod-1', 'prod-2']);
    });
  });

  describe('has', () => {
    it('returns true for items in wishlist', () => {
      useWishlistStore.setState({ items: ['prod-1', 'prod-2'] });
      expect(useWishlistStore.getState().has('prod-1')).toBe(true);
    });

    it('returns false for items not in wishlist', () => {
      useWishlistStore.setState({ items: ['prod-1'] });
      expect(useWishlistStore.getState().has('prod-3')).toBe(false);
    });
  });

  describe('clear', () => {
    it('clears all items', () => {
      useWishlistStore.setState({ items: ['prod-1', 'prod-2', 'prod-3'] });
      useWishlistStore.getState().clear();
      expect(useWishlistStore.getState().items).toHaveLength(0);
    });
  });
});
