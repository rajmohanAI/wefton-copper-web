// ============================================================
// Wefton Copper — Search Store Unit Tests
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore } from '@/store/searchStore';

describe('searchStore', () => {
  beforeEach(() => {
    useSearchStore.setState({ query: '', isOpen: false, history: [] });
  });

  describe('setQuery', () => {
    it('sets the query string', () => {
      useSearchStore.getState().setQuery('premium tee');
      expect(useSearchStore.getState().query).toBe('premium tee');
    });
  });

  describe('openSearch / closeSearch', () => {
    it('opens search overlay', () => {
      useSearchStore.getState().openSearch();
      expect(useSearchStore.getState().isOpen).toBe(true);
    });

    it('closes search overlay and clears query', () => {
      useSearchStore.setState({ isOpen: true, query: 'test' });
      useSearchStore.getState().closeSearch();
      expect(useSearchStore.getState().isOpen).toBe(false);
      expect(useSearchStore.getState().query).toBe('');
    });
  });

  describe('addToHistory', () => {
    it('adds a query to history at index 0', () => {
      useSearchStore.getState().addToHistory('polo');
      expect(useSearchStore.getState().history[0]).toBe('polo');
    });

    it('does not add empty strings', () => {
      useSearchStore.getState().addToHistory('');
      expect(useSearchStore.getState().history).toHaveLength(0);
    });

    it('does not add whitespace-only strings', () => {
      useSearchStore.getState().addToHistory('   ');
      expect(useSearchStore.getState().history).toHaveLength(0);
    });

    it('trims whitespace from queries', () => {
      useSearchStore.getState().addToHistory('  polo  ');
      expect(useSearchStore.getState().history[0]).toBe('polo');
    });

    it('removes duplicates and places most recent first', () => {
      useSearchStore.getState().addToHistory('polo');
      useSearchStore.getState().addToHistory('tee');
      useSearchStore.getState().addToHistory('polo');
      const history = useSearchStore.getState().history;
      expect(history).toEqual(['polo', 'tee']);
    });

    it('caps history at 5 entries', () => {
      for (let i = 1; i <= 7; i++) {
        useSearchStore.getState().addToHistory(`query-${i}`);
      }
      const history = useSearchStore.getState().history;
      expect(history).toHaveLength(5);
      expect(history[0]).toBe('query-7');
      expect(history[4]).toBe('query-3');
    });
  });

  describe('clearHistory', () => {
    it('clears all history', () => {
      useSearchStore.getState().addToHistory('polo');
      useSearchStore.getState().addToHistory('tee');
      useSearchStore.getState().clearHistory();
      expect(useSearchStore.getState().history).toHaveLength(0);
    });
  });
});
