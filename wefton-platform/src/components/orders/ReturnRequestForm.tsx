'use client';

import { useState } from 'react';
import { RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import { isReturnEligible, createReturnRequest } from '@/services/returnService';
import Button from '@/components/ui/Button';
import type { Order, OrderItem, ReturnReason, ReturnItem } from '@/types';

// ============================================================
// Return reasons for the dropdown selector
// ============================================================
const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: 'defective', label: 'Defective / Damaged' },
  { value: 'wrong_item', label: 'Wrong Item Received' },
  { value: 'size_issue', label: 'Size Issue' },
  { value: 'changed_mind', label: 'Changed My Mind' },
  { value: 'other', label: 'Other' },
];

const MAX_COMMENTS_LENGTH = 500;

// ============================================================
// Props
// ============================================================
interface ReturnRequestFormProps {
  order: Order;
  customerId: string;
  /** Optional delivery date override (defaults to order.updatedAt for delivered orders) */
  deliveryDate?: string | Date;
}

// ============================================================
// Component
// ============================================================
export default function ReturnRequestForm({
  order,
  customerId,
  deliveryDate,
}: ReturnRequestFormProps) {
  // Determine the delivery date — use provided, or fall back to updatedAt/createdAt
  const resolvedDeliveryDate = deliveryDate || order.updatedAt || order.createdAt;

  // Check eligibility
  const eligible = isReturnEligible(order.orderStatus, resolvedDeliveryDate);

  // Form state
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState<ReturnReason | ''>('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Confirmation state
  const [returnRequestId, setReturnRequestId] = useState<string | null>(null);

  // ─── Ineligible state ───────────────────────────────────────
  if (!eligible) {
    return (
      <div className="mt-4 p-4 rounded border border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-center gap-2 text-yellow-400">
          <AlertTriangle size={16} />
          <p className="text-sm font-medium">Return window has expired</p>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Returns are accepted within 7 days of delivery. The return window for this order has closed.
        </p>
      </div>
    );
  }

  // ─── Confirmation state ─────────────────────────────────────
  if (returnRequestId) {
    return (
      <div className="mt-4 p-6 rounded border border-green-500/30 bg-green-500/5">
        <div className="flex items-center gap-2 text-green-400 mb-3">
          <CheckCircle size={18} />
          <p className="text-sm font-medium">Return Request Submitted</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-[var(--text-light)]">
            <span className="text-[var(--text-muted)]">Request ID: </span>
            <span className="font-mono font-medium">{returnRequestId}</span>
          </p>
          <p className="text-[var(--text-muted)]">
            Your return request will be processed within{' '}
            <span className="text-[var(--text-light)] font-medium">3–5 business days</span>.
            You can track the status in your account.
          </p>
        </div>
      </div>
    );
  }

  // ─── Handlers ───────────────────────────────────────────────
  const toggleItem = (index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (selectedItems.size === 0) {
      setError('Please select at least one item to return.');
      return;
    }
    if (!reason) {
      setError('Please select a reason for return.');
      return;
    }

    setSubmitting(true);

    try {
      // Build return items from selected order items
      const items: ReturnItem[] = Array.from(selectedItems).map((idx) => {
        const orderItem: OrderItem = order.products[idx];
        return {
          productId: orderItem.productId,
          variantId: orderItem.productId, // fallback variant ID
          title: orderItem.title,
          size: orderItem.size,
          color: orderItem.color,
          quantity: orderItem.quantity,
          image: orderItem.image,
        };
      });

      const returnId = await createReturnRequest({
        orderId: order.orderId,
        customerId,
        items,
        reason: reason as ReturnReason,
        comments: comments.trim() || undefined,
      });

      setReturnRequestId(returnId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit return request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Form ──────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="mt-4 p-5 rounded border border-[var(--border-subtle)] bg-white/[0.02]">
      <div className="flex items-center gap-2 mb-4">
        <RotateCcw size={16} className="text-[var(--copper-light)]" />
        <h3 className="text-sm font-medium text-[var(--text-light)]">Request a Return</h3>
      </div>

      {/* Item selection */}
      <fieldset className="mb-4">
        <legend className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
          Select items to return
        </legend>
        <div className="space-y-2">
          {order.products.map((item, idx) => (
            <label
              key={`${item.productId}-${item.size}-${item.color}-${idx}`}
              className="flex items-center gap-3 p-3 rounded border border-[var(--border-subtle)] cursor-pointer hover:border-[var(--copper-main)]/40 transition-colors has-[:checked]:border-[var(--copper-main)]/60 has-[:checked]:bg-[var(--copper-main)]/5"
            >
              <input
                type="checkbox"
                checked={selectedItems.has(idx)}
                onChange={() => toggleItem(idx)}
                className="w-4 h-4 rounded border-[var(--border-subtle)] accent-[var(--copper-main)]"
              />
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {item.image && (
                  <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-white/5">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-light)] truncate">{item.title}</p>
                  <div className="flex gap-2 text-xs text-[var(--text-muted)]">
                    {item.size && <span>Size: {item.size}</span>}
                    {item.color && <span>Colour: {item.color}</span>}
                    <span>Qty: {item.quantity}</span>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Reason dropdown */}
      <div className="mb-4">
        <label
          htmlFor={`return-reason-${order.orderId}`}
          className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5"
        >
          Reason for return
        </label>
        <select
          id={`return-reason-${order.orderId}`}
          value={reason}
          onChange={(e) => setReason(e.target.value as ReturnReason)}
          className="w-full h-10 px-3 text-sm rounded border border-[var(--border-subtle)] bg-[var(--bg-dark)] text-[var(--text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--copper-light)] appearance-none"
          required
        >
          <option value="" disabled>
            Select a reason…
          </option>
          {RETURN_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Comments */}
      <div className="mb-4">
        <label
          htmlFor={`return-comments-${order.orderId}`}
          className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5"
        >
          Additional comments{' '}
          <span className="normal-case font-normal">(optional)</span>
        </label>
        <textarea
          id={`return-comments-${order.orderId}`}
          value={comments}
          onChange={(e) => setComments(e.target.value.slice(0, MAX_COMMENTS_LENGTH))}
          maxLength={MAX_COMMENTS_LENGTH}
          rows={3}
          placeholder="Describe the issue (optional)…"
          className="w-full px-3 py-2 text-sm rounded border border-[var(--border-subtle)] bg-[var(--bg-dark)] text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--copper-light)] resize-none"
        />
        <p className="text-xs text-[var(--text-muted)] mt-1 text-right">
          {comments.length}/{MAX_COMMENTS_LENGTH}
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="copper"
        size="sm"
        loading={submitting}
        disabled={submitting || selectedItems.size === 0 || !reason}
      >
        <RotateCcw size={14} />
        Submit Return Request
      </Button>
    </form>
  );
}
