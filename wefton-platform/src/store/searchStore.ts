// ============================================================
// Wefton Copper — Search Store (Zustand)
// ============================================================
import { create } from 'zustand';

interface SearchStore {
  query: string;
  isOpen: boolean;
  history: string[];
  setQuery: (q: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
  addToHistory: (q: string) => void;
  clearHistory: () => void;
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  query: '',
  isOpen: false,
  history: [],

  setQuery: (q) => set({ query: q }),
  openSearch: () => set({ isOpen: true }),
  closeSearch: () => set({ isOpen: false, query: '' }),

  addToHistory: (q) => {
    if (!q.trim()) return;
    const prev = get().history.filter((h) => h !== q);
    set({ history: [q, ...prev].slice(0, 8) });
  },

  clearHistory: () => set({ history: [] }),
}));
