// ============================================================
// Wefton Copper — UI Store (Zustand)
// Manages global UI state such as the AuthModal visibility.
// ============================================================
import { create } from 'zustand';

interface UIStore {
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isAuthModalOpen: false,
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
