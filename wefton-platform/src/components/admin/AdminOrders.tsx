'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  CheckCircle,
  XCircle,
  Truck,
  X,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { updateOrderStatus } from '@/services/orderService';
import { formatPrice, toDate } from '@/lib/utils';
import { itemsSummary } from '@/lib/orderSummary';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { Order } from '@/types';

type OrderSubTab = 'pending' | 'all';

// Colour-coded badge mapping for payment status
function getPaymentBadgeVariant(status: Order['paymentStatus']): 'success' | 'warning' | 'error' | 'neutral' | 'copper' {
  switch (status) {
    case 'verified': return 'success';
    case 'uploaded': return 'warning';
    case 'failed': return 'error';
    case 'refunded': return 'copper';
    case 'refund_due': return 'error';
    default: return 'neutral';
  }
}

// Colour-coded badge mapping for order status
function getOrderBadgeVariant(status: Order['orderStatus']): 'success' | 'warning' | 'error' | 'neutral' | 'copper' {
  switch (status) {
    case 'placed': return 'neutral';
    case 'confirmed': return 'copper';
    case 'processing': return 'warning';
    case 'shipped': return 'copper';
    case 'delivered': return 'success';
    case 'closed': return 'success';
    case 'cancelled': return 'error';
    default: return 'neutral';
  }
}

const ORDER_STATUSES: Order['orderStatus'][] = [
  'placed', 'confirmed', 'processing', 'shipped', 'delivered', 'closed', 'cancelled',
];

const OPEN_STATUSES: Order['orderStatus'][] = ['placed', 'confirmed', 'processing', 'shipped'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days the order has been open (from payment), or null once it's finished. */
function openDays(order: Order): number | null {
  if (!OPEN_STATUSES.includes(order.orderStatus)) return null;
  const from = toDate(order.placedAt) || toDate(order.createdAt);
  return from ? Math.floor((Date.now() - from.getTime()) / DAY_MS) : null;
}

function ageClass(days: number): string {
  if (days >= 8) return 'text-red-600 dark:text-red-400 font-semibold';
  if (days >= 5) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-[var(--text-muted)]';
}

// Checkout creates the order before payment, so unpaid ones are abandoned checkouts.
const isUnpaid = (o: Order) => o.paymentStatus === 'pending' && !o.placedAt;

const ORDER_GRID = 'grid-cols-[minmax(0,1.2fr)_88px_minmax(0,1.4fr)_minmax(0,1.3fr)_72px_96px_88px_44px_150px]';

const ADMIN_SELECT =
  'bg-[var(--wc-surface)] border border-[var(--wc-line)] rounded text-[var(--text-light)] focus:outline-none focus:border-[var(--copper-main)]';

export default function AdminOrders() {
  const [subTab, setSubTab] = useState<OrderSubTab>('pending');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showUnpaid, setShowUnpaid] = useState(false);
  const [accountEmails, setAccountEmails] = useState<Record<string, string>>({});

  // Real-time Firestore onSnapshot listener
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersData = snapshot.docs.map((doc) => ({
          ...(doc.data() as Order),
          _docId: doc.id,
        }));
        setOrders(ordersData as (Order & { _docId: string })[]);
        setLoading(false);
      },
      (error) => {
        console.error('[AdminOrders] onSnapshot error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Older orders didn't store the customer's email; look it up from their account.
  useEffect(() => {
    const uids = [...new Set(orders.filter((o) => !o.customerEmail && o.userId && o.userId !== 'guest').map((o) => o.userId))]
      .filter((uid) => !(uid in accountEmails));
    if (uids.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getFirebaseAuth()?.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch('/api/admin/orders/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ uids: uids.slice(0, 100) }),
        });
        const data = (await res.json().catch(() => ({}))) as { emails?: Record<string, string> };
        if (!cancelled && res.ok) {
          setAccountEmails((prev) => ({ ...prev, ...Object.fromEntries(uids.map((u) => [u, data.emails?.[u] ?? ''])) }));
        }
      } catch (err) {
        console.warn('[AdminOrders] Customer email lookup failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orders, accountEmails]);

  const emailFor = (o: Order) => o.customerEmail || accountEmails[o.userId] || '';

  // Pending payments: paymentStatus == "uploaded", sorted by createdAt asc (oldest first)
  const pendingOrders = orders
    .filter((o) => o.paymentStatus === 'uploaded')
    .sort((a, b) => (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0));

  const unpaidCount = orders.filter(isUnpaid).length;
  const visibleOrders = showUnpaid ? orders : orders.filter((o) => !isUnpaid(o));

  const handleApprovePayment = useCallback(async (order: Order & { _docId?: string }) => {
    const docId = order._docId || order.orderId;
    setActionLoading(docId);
    try {
      await updateOrderStatus(docId, 'confirmed', 'verified');
      setSelectedOrder(null);
    } catch (err) {
      console.error('Failed to approve payment:', err);
      alert('Failed to approve payment. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleRejectPayment = useCallback(async (order: Order & { _docId?: string }) => {
    const docId = order._docId || order.orderId;
    setActionLoading(docId);
    try {
      await updateOrderStatus(docId, 'cancelled', 'failed');
      setSelectedOrder(null);
    } catch (err) {
      console.error('Failed to reject payment:', err);
      alert('Failed to reject payment. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleStatusChange = useCallback(async (order: Order & { _docId?: string }, newStatus: Order['orderStatus']) => {
    const docId = order._docId || order.orderId;
    setActionLoading(docId);
    try {
      await updateOrderStatus(docId, newStatus);
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Failed to update order status. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleTrackingSubmit = useCallback(async (order: Order & { _docId?: string }) => {
    const docId = order._docId || order.orderId;
    const trackingNumber = trackingInputs[docId];
    if (!trackingNumber?.trim()) return;

    setActionLoading(docId);
    try {
      // Update to shipped status with tracking number
      await updateOrderStatus(docId, 'shipped', undefined, { trackingNumber: trackingNumber.trim() });
      setTrackingInputs((prev) => ({ ...prev, [docId]: '' }));
    } catch (err) {
      console.error('Failed to update tracking number:', err);
      alert('Failed to save tracking number. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, [trackingInputs]);

  // createdAt is a Firestore Timestamp, not a string ("Invalid Date" before).
  const formatDate = (value: unknown) => {
    const d = toDate(value);
    return d
      ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-4 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => setSubTab('pending')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            subTab === 'pending'
              ? 'border-[var(--copper-light)] text-[var(--copper-light)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-light)]'
          }`}
        >
          Pending Payments
          {pendingOrders.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
              {pendingOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('all')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            subTab === 'all'
              ? 'border-[var(--copper-light)] text-[var(--copper-light)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-light)]'
          }`}
        >
          All Orders
          <span className="ml-2 text-xs text-[var(--text-muted)]">({visibleOrders.length})</span>
        </button>
        {subTab === 'all' && unpaidCount > 0 && (
          <label className="ml-auto pb-3 flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={showUnpaid}
              onChange={(e) => setShowUnpaid(e.target.checked)}
              className="w-3.5 h-3.5 accent-[var(--copper-main)]"
            />
            Show unpaid checkouts ({unpaidCount})
          </label>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* Pending Payments Sub-tab */}
          {subTab === 'pending' && (
            <div className="space-y-4">
              {pendingOrders.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
                  <p className="text-[var(--text-muted)]">No pending payments to verify</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.map((order) => (
                    <div key={order.orderId} className="glass-card p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-light)]">{order.orderId}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {order.shippingAddress?.name} · {formatPrice(order.total)}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye size={14} /> View Details
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={actionLoading === ((order as Order & { _docId?: string })._docId || order.orderId)}
                            onClick={() => handleApprovePayment(order as Order & { _docId?: string })}
                          >
                            <CheckCircle size={14} /> Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={actionLoading === ((order as Order & { _docId?: string })._docId || order.orderId)}
                            onClick={() => handleRejectPayment(order as Order & { _docId?: string })}
                          >
                            <XCircle size={14} /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All Orders Sub-tab */}
          {subTab === 'all' && (
            <div className="space-y-3">
              {visibleOrders.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-[var(--text-muted)]">No orders yet</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className={`hidden lg:grid ${ORDER_GRID} gap-3 px-5 py-2 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider`}>
                    <div>Order ID</div>
                    <div>Date</div>
                    <div>Customer</div>
                    <div>Items</div>
                    <div>Total</div>
                    <div>Payment</div>
                    <div>Status</div>
                    <div title="Days since the order was placed">Open</div>
                    <div>Actions</div>
                  </div>

                  {visibleOrders.map((order) => {
                    const docId = (order as Order & { _docId?: string })._docId || order.orderId;
                    const days = openDays(order);
                    const items = itemsSummary(order);
                    const email = emailFor(order);
                    return (
                      <div key={order.orderId} className="glass-card p-5">
                        {/* Desktop layout */}
                        <div className={`hidden lg:grid ${ORDER_GRID} gap-3 items-center`}>
                          <div>
                            <p className="text-xs font-medium text-[var(--text-light)] truncate" title={order.orderId}>{order.orderId}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-muted)]">{formatDate(order.placedAt || order.createdAt)}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-[var(--text-light)] truncate">{order.customerName || order.shippingAddress?.name || 'N/A'}</p>
                            <p className="text-[11px] text-[var(--text-muted)] truncate" title={email}>{email || '—'}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-[var(--text-light)] truncate" title={items}>{items || '—'}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {order.itemCount ?? (order.products || []).reduce((n, i) => n + i.quantity, 0)} item(s)
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--copper-light)]">{formatPrice(order.total)}</p>
                          </div>
                          <div>
                            <Badge variant={getPaymentBadgeVariant(order.paymentStatus)}>
                              {order.paymentStatus.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div>
                            <Badge variant={getOrderBadgeVariant(order.orderStatus)}>
                              {order.orderStatus}
                            </Badge>
                          </div>
                          <div>
                            {days === null ? (
                              <span className="text-xs text-[var(--text-faint)]">—</span>
                            ) : (
                              <span className={`text-xs ${ageClass(days)}`}>{days}d</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={order.orderStatus}
                              onChange={(e) => handleStatusChange(order as Order & { _docId?: string }, e.target.value as Order['orderStatus'])}
                              disabled={actionLoading === docId}
                              aria-label="Order status"
                              className={`h-8 px-2 text-xs ${ADMIN_SELECT}`}
                            >
                              {ORDER_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-1.5 rounded hover:bg-[var(--wc-canvas)] text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors"
                              title="View details"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Mobile layout */}
                        <div className="lg:hidden space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-[var(--text-light)]">{order.orderId}</p>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-1.5 rounded hover:bg-[var(--wc-canvas)] text-[var(--text-muted)] hover:text-[var(--text-light)]"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                            <span>{order.customerName || order.shippingAddress?.name || 'N/A'}</span>
                            <span>
                              {formatDate(order.placedAt || order.createdAt)}
                              {days !== null && <span className={`ml-2 ${ageClass(days)}`}>{days}d open</span>}
                            </span>
                          </div>
                          {email && <p className="text-[11px] text-[var(--text-muted)] truncate">{email}</p>}
                          {items && <p className="text-xs text-[var(--text-light)]">{items}</p>}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--copper-light)]">{formatPrice(order.total)}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={getPaymentBadgeVariant(order.paymentStatus)}>
                                {order.paymentStatus.replace('_', ' ')}
                              </Badge>
                              <Badge variant={getOrderBadgeVariant(order.orderStatus)}>
                                {order.orderStatus}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={order.orderStatus}
                              onChange={(e) => handleStatusChange(order as Order & { _docId?: string }, e.target.value as Order['orderStatus'])}
                              disabled={actionLoading === docId}
                              aria-label="Order status"
                              className={`flex-1 h-8 px-2 text-xs ${ADMIN_SELECT}`}
                            >
                              {ORDER_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Tracking number input when status is "shipped" */}
                        {order.orderStatus === 'shipped' && !order.trackingNumber && (
                          <div className="mt-3 flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                            <Truck size={14} className="text-[var(--text-muted)] shrink-0" />
                            <input
                              type="text"
                              placeholder="Enter tracking number"
                              value={trackingInputs[docId] || ''}
                              onChange={(e) => setTrackingInputs((prev) => ({ ...prev, [docId]: e.target.value }))}
                              className={`flex-1 h-8 px-3 text-xs placeholder:text-[var(--text-faint)] ${ADMIN_SELECT}`}
                            />
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleTrackingSubmit(order as Order & { _docId?: string })}
                              loading={actionLoading === docId}
                              disabled={!trackingInputs[docId]?.trim()}
                            >
                              Save
                            </Button>
                          </div>
                        )}
                        {order.trackingNumber && (
                          <div className="mt-3 flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                            <Truck size={14} className="text-emerald-400 shrink-0" />
                            <span className="text-xs text-[var(--text-muted)]">Tracking:</span>
                            <span className="text-xs text-[var(--text-light)] font-mono">{order.trackingNumber}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(order.trackingNumber || '');
                              }}
                              className="p-1 rounded hover:bg-[var(--wc-canvas)] text-[var(--text-muted)]"
                              title="Copy tracking number"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[var(--wc-surface)] text-[var(--text-light)] border border-[var(--wc-line)] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[var(--wc-line)] bg-[var(--wc-surface)]">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-light)]">Order Details</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{selectedOrder.orderId}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded hover:bg-[var(--wc-canvas)] text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-5">
                {/* Customer & Order Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Customer</p>
                    <p className="text-sm text-[var(--text-light)]">{selectedOrder.customerName || selectedOrder.shippingAddress?.name || 'N/A'}</p>
                    {emailFor(selectedOrder) && (
                      <a href={`mailto:${emailFor(selectedOrder)}`} className="block text-xs text-[var(--copper-light)] break-all">{emailFor(selectedOrder)}</a>
                    )}
                    <p className="text-xs text-[var(--text-muted)]">{selectedOrder.customerPhone || selectedOrder.shippingAddress?.phone}</p>
                    <p className="text-xs text-[var(--text-muted)]">Placed {formatDate(selectedOrder.placedAt || selectedOrder.createdAt)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Total</p>
                    <p className="text-lg font-light text-[var(--copper-light)]">{formatPrice(selectedOrder.total)}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPaymentBadgeVariant(selectedOrder.paymentStatus)}>
                        {selectedOrder.paymentStatus.replace('_', ' ')}
                      </Badge>
                      <Badge variant={getOrderBadgeVariant(selectedOrder.orderStatus)}>
                        {selectedOrder.orderStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Shipping Address</p>
                  <div className="text-xs text-[var(--text-light)] leading-relaxed">
                    <p>{selectedOrder.shippingAddress?.line1}</p>
                    {selectedOrder.shippingAddress?.line2 && <p>{selectedOrder.shippingAddress.line2}</p>}
                    <p>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.pincode}</p>
                    <p>{selectedOrder.shippingAddress?.country || 'India'}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Items ({selectedOrder.products?.length})</p>
                  <div className="space-y-2">
                    {selectedOrder.products?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded bg-[var(--wc-canvas)]">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[var(--text-light)] truncate">
                            {item.productCode && <span className="font-mono text-[var(--copper-light)] mr-1.5">{item.productCode}</span>}
                            {item.title}
                          </p>
                          {item.sku && <p className="text-[10px] font-mono text-[var(--text-faint)]">SKU {item.sku}</p>}
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {item.size && `Size: ${item.size}`}
                            {item.size && item.color && ' · '}
                            {item.color && `Color: ${item.color}`}
                            {' · '}Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="text-xs text-[var(--copper-light)]">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Screenshot */}
                {selectedOrder.paymentScreenshot && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Payment Screenshot</p>
                    <a
                      href={selectedOrder.paymentScreenshot}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative group"
                    >
                      <img
                        src={selectedOrder.paymentScreenshot}
                        alt="Payment screenshot"
                        className="w-full max-w-xs rounded border border-[var(--border-subtle)] cursor-pointer hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded">
                        <ExternalLink size={20} className="text-white" />
                      </div>
                    </a>
                  </div>
                )}

                {/* UPI Reference */}
                {selectedOrder.paymentReference && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">UPI Reference</p>
                    <p className="text-sm text-[var(--text-light)] font-mono bg-[var(--wc-canvas)] px-3 py-2 rounded inline-block">
                      {selectedOrder.paymentReference}
                    </p>
                  </div>
                )}

                {/* Status history */}
                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">History</p>
                    <ul className="space-y-1 text-xs text-[var(--text-muted)]">
                      {selectedOrder.statusHistory.map((ev, i) => (
                        <li key={i}>
                          <span className="text-[var(--text-light)]">{ev.status}</span> · {formatDate(ev.at)} · {ev.by}
                          {ev.note ? ` · ${ev.note}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons for pending payments */}
                {selectedOrder.paymentStatus === 'uploaded' && (
                  <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-subtle)]">
                    <Button
                      variant="primary"
                      size="md"
                      loading={actionLoading === ((selectedOrder as Order & { _docId?: string })._docId || selectedOrder.orderId)}
                      onClick={() => handleApprovePayment(selectedOrder as Order & { _docId?: string })}
                    >
                      <CheckCircle size={14} /> Approve Payment
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      loading={actionLoading === ((selectedOrder as Order & { _docId?: string })._docId || selectedOrder.orderId)}
                      onClick={() => handleRejectPayment(selectedOrder as Order & { _docId?: string })}
                    >
                      <XCircle size={14} /> Reject Payment
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
