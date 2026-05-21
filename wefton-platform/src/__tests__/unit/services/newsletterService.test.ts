// ============================================================
// Wefton Copper — Newsletter Service Unit Tests
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subscribeNewsletter } from '@/services/newsletterService';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection-ref'),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
  getDocs: vi.fn(),
  query: vi.fn(() => 'mock-query'),
  where: vi.fn(() => 'mock-where'),
  serverTimestamp: vi.fn(() => 'mock-server-timestamp'),
}));

// Mock firebase lazy getter
vi.mock('@/lib/firebase', () => ({
  getFirebaseDb: vi.fn(() => 'mock-db'),
}));

import { getDocs } from 'firebase/firestore';

const mockGetDocs = vi.mocked(getDocs);

describe('newsletterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeNewsletter', () => {
    it('should return already subscribed message when email exists', async () => {
      // Simulate existing subscriber
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'existing-doc', data: () => ({ email: 'test@example.com' }) }],
      } as any);

      const result = await subscribeNewsletter('test@example.com');

      expect(result).toEqual({
        success: false,
        message: 'You are already subscribed',
      });
    });

    it('should subscribe new email and return success', async () => {
      // Simulate no existing subscriber
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      } as any);

      const result = await subscribeNewsletter('new@example.com');

      expect(result).toEqual({
        success: true,
        message: 'Successfully subscribed!',
      });
    });

    it('should throw when Firebase is not configured', async () => {
      const { getFirebaseDb } = await import('@/lib/firebase');
      vi.mocked(getFirebaseDb).mockReturnValueOnce(null);

      await expect(subscribeNewsletter('test@example.com')).rejects.toThrow(
        'Firebase not configured'
      );
    });
  });
});
