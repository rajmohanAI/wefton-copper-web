// ============================================================
// Wefton Copper — support requests (Contact Us + Wheez), admin side
// ============================================================

export const SUPPORT_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'in_review', label: 'In review' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'resolved', label: 'Resolved' },
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number]['value'];

export function isSupportStatus(value: string): value is SupportStatus {
  return SUPPORT_STATUSES.some((s) => s.value === value);
}

export interface SupportRequest {
  id: string;
  requestId: string;
  source: 'wheez' | 'contact-page' | string;
  /** Wheez: return | complaint | suggestion | report. Contact page: none. */
  type?: string;
  /** Contact page topic, or the Wheez topic / return reason. */
  topic?: string;
  topicLabel?: string;
  outcome?: string;
  orderId?: string;
  items?: { title: string; size: string; color: string; quantity: number }[];
  message?: string;
  pageUrl?: string;
  name?: string;
  email?: string;
  phone?: string;
  images?: string[];
  status: SupportStatus;
  adminNote?: string;
  createdAt: string | null;
  updatedAt: string | null;
}
