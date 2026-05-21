// ============================================================
// Wefton Copper — Property-Based Tests: Search History Invariants
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useSearchStore } from '@/store/searchStore';

describe('Feature: wefton-copper-platform, Property 8: Search history invariants', () => {
  /**
   * **Validates: Requirements 32.8**
   *
   * For any sequence of addToHistory calls with query strings, the resulting
   * history array SHALL:
   * (a) have the most recent query at index 0,
   * (b) contain no duplicate entries,
   * (c) have a maximum length of 5,
   * (d) not contain empty or whitespace-only strings.
   */

  beforeEach(() => {
    // Reset the store before each test
    useSearchStore.setState({ history: [], query: '', isOpen: false });
  });

  it('Property 8: most recent non-empty query is at index 0', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
        (queries) => {
          // Reset store
          useSearchStore.setState({ history: [] });

          // Apply all queries
          for (const q of queries) {
            useSearchStore.getState().addToHistory(q);
          }

          const history = useSearchStore.getState().history;

          // Find the last non-empty/non-whitespace query
          const lastNonEmpty = [...queries].reverse().find((q) => q.trim().length > 0);

          if (lastNonEmpty && history.length > 0) {
            expect(history[0]).toBe(lastNonEmpty.trim());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: history contains no duplicate entries', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
        (queries) => {
          // Reset store
          useSearchStore.setState({ history: [] });

          // Apply all queries
          for (const q of queries) {
            useSearchStore.getState().addToHistory(q);
          }

          const history = useSearchStore.getState().history;
          const uniqueSet = new Set(history);
          expect(history.length).toBe(uniqueSet.size);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: history has maximum length of 5', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 30 }),
        (queries) => {
          // Reset store
          useSearchStore.setState({ history: [] });

          // Apply all queries
          for (const q of queries) {
            useSearchStore.getState().addToHistory(q);
          }

          const history = useSearchStore.getState().history;
          expect(history.length).toBeLessThanOrEqual(5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: history does not contain empty or whitespace-only strings', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 50 }),
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t\n')
          ),
          { minLength: 1, maxLength: 20 }
        ),
        (queries) => {
          // Reset store
          useSearchStore.setState({ history: [] });

          // Apply all queries (including empty/whitespace ones)
          for (const q of queries) {
            useSearchStore.getState().addToHistory(q);
          }

          const history = useSearchStore.getState().history;
          for (const entry of history) {
            expect(entry.trim().length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
