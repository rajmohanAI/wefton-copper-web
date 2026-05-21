// ============================================================
// Wefton Copper — Auth Modal Store (Zustand)
// Re-exports from uiStore for convenience and backward compatibility.
// ============================================================
import { useUIStore } from './uiStore';

/**
 * Hook to access auth modal state.
 * Wraps the uiStore's auth modal fields for a cleaner API.
 */
export function useAuthModalStore() {
  const isOpen = useUIStore((state) => state.isAuthModalOpen);
  const openModal = useUIStore((state) => state.openAuthModal);
  const closeModal = useUIStore((state) => state.closeAuthModal);
  return { isOpen, openModal, closeModal };
}
