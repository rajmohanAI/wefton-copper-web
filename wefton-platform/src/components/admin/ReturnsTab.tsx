'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  Check,
  X,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';
import { getReturnsByStatus, updateReturnStatus } from '@/services/returnService';
import { incrementInventory } from '@/services/inventoryService';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { ReturnRequest, ReturnStatus } from '@/types';

// ============================================================
// Status filter options
// ============================================================

type FilterOption = 'all' | ReturnStatus;

const FILTER_OPTIONS: { label: string; value: FilterOption }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Refunded', value: 'refunded' },
];

// ============================================================
// Helper functions
// ============================================================

function getStatusBadgeVariant(status: ReturnStatus): 'warning' | 'success' | 'error' | 'copper' | 'blue' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    case 'refunded':
      return 'blue';
    default:
      return 'warning';
  }
}

function getReasonLabel(reason: string): string {
  switch (reason) {
    case 'defective':
      return 'Defective';
    case 'wrong_item':
      return 'Wrong Item';
    case 'size_issue':
      return 'Size Issue';
    case 'changed_mind':
      return 'Changed Mind';
    case 'other':
      return 'Other';
    default:
      return reason;
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const date = typeof dateStr === 'object' && 'seconds' in (dateStr as object)
      ? new Date((dateStr as unknown as { seconds: number }).seconds * 1000)
      : new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function truncateId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 8)}…`;
}

// ============================================================
// Detail / Expanded Row Component
// ============================================================

interface ReturnDetailProps {
  request: ReturnRequest;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onRefund: (request: ReturnRequest) => void;
  actionLoading: string | null;
}

function ReturnDetail({ request, onApprove, onReject, onRefund, actionLoading }: ReturnDetailProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectError, setRejectError] = useState('');

  const handleRejectSubmit = () => {
    if (rejectionReason.length < 10) {
      setRejectError('Rejection reason must be at least 10 characters');
      return;
    }
    setRejectError('');
    onReject(request.returnId, rejectionReason);
    setShowRejectInput(false);
    setRejectionReason('');
  };

  return (
    <div className="px-4 pb-4 space-y-4">
      {/* Items */}
      <div>
        <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Returned Items
        </h4>
        <div className="space-y-2">
          {request.items.map((item, idx) => (
            <div
              key={`${item.productId}-${idx}`}
              className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                  <Package size={16} className="text-[var(--text-faint)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-light)] truncate">{item.title}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {item.size && `Size: ${item.size}`}
                  {item.size && item.color && ' · '}
                  {item.color && `Color: ${item.color}`}
                  {(item.size || item.color) && ' · '}
                  Qty: {item.quantity}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reason & Comments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Reason
          </h4>
          <p className="text-sm text-[var(--text-light)]">{getReasonLabel(request.reason)}</p>
        </div>
        <div>
          <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Comments
          </h4>
          <p className="text-sm text-[var(--text-light)]">
            {request.comments || 'No additional comments'}
          </p>
        </div>
      </div>

      {/* Rejection reason (if rejected) */}
      {request.status === 'rejected' && request.rejectionReason && (
        <div>
          <h4 className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Rejection Reason
          </h4>
          <p className="text-sm text-red-400">{request.rejectionReason}</p>
        </div>
      )}

      {/* Actions */}
      {request.status === 'pending' && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
          <Button
            variant="copper"
            size="sm"
            onClick={() => onApprove(request.returnId)}
            loading={actionLoading === `approve-${request.returnId}`}
            disabled={!!actionLoading}
          >
            <Check size={14} /> Approve
          </Button>

          {!showRejectInput ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowRejectInput(true)}
              disabled={!!actionLoading}
            >
              <X size={14} /> Reject
            </Button>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (e.target.value.length >= 10) setRejectError('');
                }}
                placeholder="Rejection reason (min 10 characters)"
                className="flex-1 h-8 px-3 rounded bg-white/5 border border-white/10 text-sm text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-red-500/50"
              />
              <Button
                variant="danger"
                size="sm"
                onClick={handleRejectSubmit}
                loading={actionLoading === `reject-${request.returnId}`}
                disabled={!!actionLoading}
              >
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectionReason('');
                  setRejectError('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
          {rejectError && (
            <p className="text-xs text-red-400 w-full">{rejectError}</p>
          )}
        </div>
      )}

      {request.status === 'approved' && (
        <div className="flex items-center gap-3 pt-2 border-t border-white/5">
          <Button
            variant="copper"
            size="sm"
            onClick={() => onRefund(request)}
            loading={actionLoading === `refund-${request.returnId}`}
            disabled={!!actionLoading}
          >
            <DollarSign size={14} /> Mark as Refunded
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main ReturnsTab Component
// ============================================================

export default function ReturnsTab() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const data = await getReturnsByStatus(status);
      setReturns(data);
    } catch (error) {
      console.error('Failed to fetch returns:', error);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const handleApprove = async (returnId: string) => {
    setActionLoading(`approve-${returnId}`);
    try {
      await updateReturnStatus(returnId, 'approved');
      await fetchReturns();
    } catch (error) {
      console.error('Failed to approve return:', error);
      alert('Failed to approve return. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (returnId: string, reason: string) => {
    setActionLoading(`reject-${returnId}`);
    try {
      await updateReturnStatus(returnId, 'rejected', reason);
      await fetchReturns();
    } catch (error) {
      console.error('Failed to reject return:', error);
      alert('Failed to reject return. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefund = async (request: ReturnRequest) => {
    setActionLoading(`refund-${request.returnId}`);
    try {
      // Update status to refunded
      await updateReturnStatus(request.returnId, 'refunded');

      // Restore inventory for returned items
      const inventoryItems = request.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        size: item.size,
        quantity: item.quantity,
      }));
      await incrementInventory(inventoryItems);

      await fetchReturns();
    } catch (error) {
      console.error('Failed to process refund:', error);
      alert('Failed to process refund. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-light text-[var(--text-light)]">
          Returns ({returns.length})
        </h2>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 glass-card w-fit rounded-lg flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              filter === opt.value
                ? 'bg-[var(--copper-main)]/10 text-[var(--copper-light)] border border-[var(--copper-main)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-light)] hover:bg-white/5'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {returns.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <RotateCcw size={40} className="text-[var(--text-faint)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">
            {filter === 'all' ? 'No return requests yet' : `No ${filter} return requests`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table header (desktop) */}
          <div className="hidden md:grid grid-cols-[120px_1fr_120px_130px_100px_120px_40px] gap-3 px-4 py-2 text-[10px] font-medium tracking-wider uppercase text-[var(--text-muted)]">
            <span>Request ID</span>
            <span>Customer</span>
            <span>Order ID</span>
            <span>Reason</span>
            <span>Status</span>
            <span>Date</span>
            <span></span>
          </div>

          {/* Return rows */}
          {returns.map((request) => (
            <div key={request.returnId} className="glass-card overflow-hidden">
              {/* Row */}
              <button
                type="button"
                onClick={() => toggleExpand(request.returnId)}
                className="w-full p-4 md:grid md:grid-cols-[120px_1fr_120px_130px_100px_120px_40px] md:gap-3 md:items-center text-left hover:bg-white/[0.02] transition-colors"
              >
                {/* Request ID */}
                <span className="text-xs text-[var(--copper-light)] font-mono">
                  {truncateId(request.returnId)}
                </span>

                {/* Customer name (use customerId as fallback) */}
                <span className="text-sm text-[var(--text-light)] truncate">
                  {request.customerId}
                </span>

                {/* Order ID */}
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {truncateId(request.orderId)}
                </span>

                {/* Reason */}
                <span className="text-xs text-[var(--text-muted)]">
                  {getReasonLabel(request.reason)}
                </span>

                {/* Status */}
                <div>
                  <Badge variant={getStatusBadgeVariant(request.status)}>
                    {request.status}
                  </Badge>
                </div>

                {/* Date */}
                <span className="text-xs text-[var(--text-muted)]">
                  {formatDate(request.createdAt)}
                </span>

                {/* Expand indicator */}
                <span className="text-[var(--text-faint)]">
                  {expandedId === request.returnId ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </span>
              </button>

              {/* Expanded detail */}
              {expandedId === request.returnId && (
                <ReturnDetail
                  request={request}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRefund={handleRefund}
                  actionLoading={actionLoading}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
