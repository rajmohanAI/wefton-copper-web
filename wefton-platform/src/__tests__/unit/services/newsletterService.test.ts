// ============================================================
// Wefton Copper — Newsletter Service Unit Tests
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subscribeNewsletter } from '@/services/newsletterService';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => {
  class FirestoreError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  }
  return {
    doc: vi.fn((_db: unknown, col: string, id: string) => `${col}/${id}`),
    setDoc: vi.fn(() => Promise.resolve()),
    serverTimestamp: vi.fn(() => 'mock-server-timestamp'),
    FirestoreError,
  };
});

// Mock firebase lazy getter
vi.mock('@/lib/firebase', () => ({
  getFirebaseDb: vi.fn(() => 'mock-db'),
}));

import { setDoc, FirestoreError } from 'firebase/firestore';

const mockSetDoc = vi.mocked(setDoc);

describe('newsletterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeNewsletter', () => {
    it('should return already subscribed message when email exists', async () => {
      // Rules deny overwriting an existing subscriber doc
      mockSetDoc.mockRejectedValueOnce(
        new (FirestoreError as any)('permission-denied', 'Missing or insufficient permissions.')
      );

      const result = await subscribeNewsletter('test@example.com');

      expect(result).toEqual({
        success: false,
        message: 'You are already subscribed',
      });
    });

    it('should subscribe new email keyed by the normalised address', async () => {
      const result = await subscribeNewsletter('  New@Example.com ');

      expect(mockSetDoc).toHaveBeenCalledWith('newsletter_subscribers/new@example.com', {
        email: 'new@example.com',
        subscribedAt: 'mock-server-timestamp',
      });
      expect(result).toEqual({
        success: true,
        message: 'Successfully subscribed!',
      });
    });

    it('should rethrow other Firestore errors', async () => {
      mockSetDoc.mockRejectedValueOnce(new (FirestoreError as any)('unavailable', 'offline'));

      await expect(subscribeNewsletter('test@example.com')).rejects.toThrow('offline');
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
