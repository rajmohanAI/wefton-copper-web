'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Ticket,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '@/services/couponService';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import type { Coupon } from '@/types';

// ============================================================
// Coupon Form Modal (inline — Create / Edit)
// ============================================================

interface CouponFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCoupon: Coupon | null;
}

function CouponFormModal({ open, onClose, onSuccess, editingCoupon }: CouponFormProps) {
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [active, setActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingCoupon) {
      setCode(editingCoupon.code);
      setDiscount(editingCoupon.discount);
      setActive(editingCoupon.active);
      setExpiresAt(
        editingCoupon.expiresAt
          ? editingCoupon.expiresAt.slice(0, 10) // date portion only for input[type=date]
          : ''
      );
    } else {
      setCode('');
      setDiscount('');
      setActive(true);
      setExpiresAt('');
    }
    setError('');
  }, [editingCoupon, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setError('Code is required');
      return;
    }
    if (!/^[A-Z0-9_-]+$/.test(trimmedCode)) {
      setError('Code must be alphanumeric (letters, numbers, _ and -)');
      return;
    }
    if (discount === '' || discount < 1 || discount > 100) {
      setError('Discount must be between 1 and 100');
      return;
    }

    setLoading(true);
    try {
      const expiresAtValue = expiresAt
        ? new Date(expiresAt + 'T23:59:59.999Z').toISOString()
        : null;

      if (editingCoupon) {
        await updateCoupon(editingCoupon.couponId, {
          discount: Number(discount),
          active,
          expiresAt: expiresAtValue,
        });
      } else {
        await createCoupon({
          code: trimmedCode,
          discount: Number(discount),
          active,
          expiresAt: expiresAtValue,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative w-[90vw] max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl p-6">
        <h3 className="text-base font-medium text-[var(--text-light)] mb-4">
          {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code field */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">
              Code *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={!!editingCoupon}
              placeholder="e.g. SUMMER25"
              className="w-full h-9 px-3 rounded bg-white/5 border border-white/10 text-sm text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)]/50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {editingCoupon && (
              <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                Code cannot be changed after creation
              </p>
            )}
          </div>

          {/* Discount field */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">
              Discount (%) *
            </label>
            <input
              type="number"
              value={discount}
              onChange={(e) =>
                setDiscount(e.target.value === '' ? '' : Number(e.target.value))
              }
              min={1}
              max={100}
              placeholder="1–100"
              className="w-full h-9 px-3 rounded bg-white/5 border border-white/10 text-sm text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)]/50"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Active
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                active ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  active ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Expiry date */}
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1 uppercase tracking-wider">
              Expiry Date (optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full h-9 px-3 rounded bg-white/5 border border-white/10 text-sm text-[var(--text-light)] focus:outline-none focus:border-[var(--copper-main)]/50"
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="copper" size="sm" loading={loading}>
              {editingCoupon ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Sort State
// ============================================================

type SortField = 'code' | 'discount' | 'expiresAt';
type SortDir = 'asc' | 'desc';

function SortIcon({ field, currentField, currentDir }: { field: SortField; currentField: SortField; currentDir: SortDir }) {
  if (field !== currentField) {
    return <ArrowUp size={12} className="opacity-30" />;
  }
  return currentDir === 'asc' ? (
    <ArrowUp size={12} className="text-[var(--copper-light)]" />
  ) : (
    <ArrowDown size={12} className="text-[var(--copper-light)]" />
  );
}

// ============================================================
// Main CouponsTab Component
// ============================================================

export default function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCoupons(sortField, sortDir);
      setCoupons(data);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDir]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleCreate = () => {
    setEditingCoupon(null);
    setFormOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCoupon(deleteTarget.couponId);
      setCoupons((prev) => prev.filter((c) => c.couponId !== deleteTarget.couponId));
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete coupon:', error);
      alert('Failed to delete coupon. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const formatExpiryDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-light text-[var(--text-light)]">
          Coupons ({coupons.length})
        </h2>
        <Button variant="copper" size="sm" onClick={handleCreate}>
          <Plus size={14} /> Create Coupon
        </Button>
      </div>

      {/* Empty state */}
      {coupons.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Ticket size={40} className="text-[var(--text-faint)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)] mb-4">No coupons yet</p>
          <Button variant="copper" onClick={handleCreate}>
            <Plus size={14} /> Create First Coupon
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_100px_100px_130px_80px] gap-3 px-4 py-2 text-[10px] font-medium tracking-wider uppercase text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => handleSort('code')}
              className="flex items-center gap-1 hover:text-[var(--text-light)] transition-colors text-left"
            >
              Code
              <SortIcon field="code" currentField={sortField} currentDir={sortDir} />
            </button>
            <button
              type="button"
              onClick={() => handleSort('discount')}
              className="flex items-center gap-1 hover:text-[var(--text-light)] transition-colors text-left"
            >
              Discount
              <SortIcon field="discount" currentField={sortField} currentDir={sortDir} />
            </button>
            <span>Status</span>
            <button
              type="button"
              onClick={() => handleSort('expiresAt')}
              className="flex items-center gap-1 hover:text-[var(--text-light)] transition-colors text-left"
            >
              Expires
              <SortIcon field="expiresAt" currentField={sortField} currentDir={sortDir} />
            </button>
            <span>Actions</span>
          </div>

          {/* Coupon rows */}
          {coupons.map((coupon) => (
            <div
              key={coupon.couponId}
              className="glass-card p-4 md:grid md:grid-cols-[1fr_100px_100px_130px_80px] md:gap-3 md:items-center"
            >
              {/* Code */}
              <div>
                <p className="text-sm text-[var(--text-light)] font-mono font-medium">
                  {coupon.code}
                </p>
              </div>

              {/* Discount */}
              <span className="text-xs text-[var(--copper-light)]">
                {coupon.discount}%
              </span>

              {/* Active Status */}
              <div>
                <Badge variant={coupon.active ? 'success' : 'error'}>
                  {coupon.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Expiry Date */}
              <span className="text-xs text-[var(--text-muted)]">
                {formatExpiryDate(coupon.expiresAt)}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-2 md:mt-0">
                <button
                  onClick={() => handleEdit(coupon)}
                  className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                  title="Edit coupon"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => setDeleteTarget(coupon)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  title="Delete coupon"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Coupon Form Modal */}
      <CouponFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchCoupons}
        editingCoupon={editingCoupon}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Coupon"
        description={`Are you sure you want to delete coupon "${deleteTarget?.code}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}
