// ============================================================
// Wefton Copper — Search Store (Zustand)
// ============================================================
import { create } from 'zustand';

interface SearchStore {
  query: string;
  isOpen: boolean;
  history: string[]; // capped at 5, no duplicates, most recent first, no empty strings
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
    const trimmed = q.trim();
    if (!trimmed) return;
    const prev = get().history.filter((h) => h !== trimmed);
    set({ history: [trimmed, ...prev].slice(0, 5) });
  },

  clearHistory: () => set({ history: [] }),
}));
