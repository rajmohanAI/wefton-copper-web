// ============================================================
// Wefton Copper — Auth Store (Zustand)
// ============================================================
import { create } from 'zustand';
import type { User } from '@/types';

interface AuthStore {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  isAdmin: () => get().user?.role === 'admin',
}));
