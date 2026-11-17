// ============================================================
// Wefton Copper — admin services shown in the Admin menu (WC-Issue-8)
// ============================================================
import type { LucideIcon } from 'lucide-react';
import { ShoppingBag, Package, BarChart3, Ticket, RotateCcw, Barcode } from 'lucide-react';

export interface AdminService {
  /** Admin dashboard tab id, or undefined for a separate admin page. */
  tab?: string;
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

export const ADMIN_DASHBOARD_TABS = ['orders', 'products', 'stats', 'coupons', 'returns'] as const;
export type AdminDashboardTab = (typeof ADMIN_DASHBOARD_TABS)[number];

export function isAdminDashboardTab(value: string | null | undefined): value is AdminDashboardTab {
  return !!value && (ADMIN_DASHBOARD_TABS as readonly string[]).includes(value);
}

export const ADMIN_SERVICES: AdminService[] = [
  { tab: 'orders', label: 'Orders', href: '/admin?tab=orders', description: 'Track, update and close orders', icon: ShoppingBag },
  { tab: 'products', label: 'Products', href: '/admin?tab=products', description: 'Add, edit and import products and stock', icon: Package },
  { tab: 'stats', label: 'Stats', href: '/admin?tab=stats', description: 'Revenue and order summary', icon: BarChart3 },
  { tab: 'coupons', label: 'Offers', href: '/admin?tab=coupons', description: 'Coupons and offers', icon: Ticket },
  { tab: 'returns', label: 'Returns', href: '/admin?tab=returns', description: 'Return and refund requests', icon: RotateCcw },
  { label: 'Serial Generator', href: '/serialgen', description: 'Serial numbers, QR tags and stickers', icon: Barcode },
];
