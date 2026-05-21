// ============================================================
// Wefton Copper — Auth Store Unit Tests
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

function createUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    addresses: [],
    wishlist: [],
    orders: [],
    role: 'user',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, loading: true });
  });

  describe('setUser', () => {
    it('sets the user', () => {
      const user = createUser();
      useAuthStore.getState().setUser(user);
      expect(useAuthStore.getState().user).toEqual(user);
    });

    it('sets user to null on logout', () => {
      useAuthStore.getState().setUser(createUser());
      useAuthStore.getState().setUser(null);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('sets loading state', () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('returns true for admin users', () => {
      useAuthStore.getState().setUser(createUser({ role: 'admin' }));
      expect(useAuthStore.getState().isAdmin()).toBe(true);
    });

    it('returns false for regular users', () => {
      useAuthStore.getState().setUser(createUser({ role: 'user' }));
      expect(useAuthStore.getState().isAdmin()).toBe(false);
    });

    it('returns false when no user is set', () => {
      expect(useAuthStore.getState().isAdmin()).toBe(false);
    });
  });
});
