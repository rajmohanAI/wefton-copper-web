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
import { getFirebaseDb } from '@/lib/firebase';
import { updateOrderStatus } from '@/services/orderService';
import { formatPrice } from '@/lib/utils';
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
    case 'cancelled': return 'error';
    default: return 'neutral';
  }
}

const ORDER_STATUSES: Order['orderStatus'][] = [
  'placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled',
];

export default function AdminOrders() {
  const [subTab, setSubTab] = useState<OrderSubTab>('pending');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  // Pending payments: paymentStatus == "uploaded", sorted by createdAt asc (oldest first)
  const pendingOrders = orders
    .filter((o) => o.paymentStatus === 'uploaded')
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });

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
      const db = getFirebaseDb();
      if (!db) throw new Error('Firebase not configured');
      const { doc: firestoreDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(firestoreDoc(db, 'orders', docId), {
        orderStatus: 'shipped',
        trackingNumber: trackingNumber.trim(),
        updatedAt: serverTimestamp(),
      });
      setTrackingInputs((prev) => ({ ...prev, [docId]: '' }));
    } catch (err) {
      console.error('Failed to update tracking number:', err);
      alert('Failed to save tracking number. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, [trackingInputs]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
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
          <span className="ml-2 text-xs text-[var(--text-muted)]">({orders.length})</span>
        </button>
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
              {orders.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-[var(--text-muted)]">No orders yet</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-2 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    <div className="col-span-2">Order ID</div>
                    <div className="col-span-2">Customer</div>
                    <div className="col-span-1">Date</div>
                    <div className="col-span-1">Total</div>
                    <div className="col-span-2">Payment</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Actions</div>
                  </div>

                  {orders.map((order) => {
                    const docId = (order as Order & { _docId?: string })._docId || order.orderId;
                    return (
                      <div key={order.orderId} className="glass-card p-5">
                        {/* Desktop layout */}
                        <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-2">
                            <p className="text-xs font-medium text-[var(--text-light)] truncate">{order.orderId}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-[var(--text-light)] truncate">{order.shippingAddress?.name || 'N/A'}</p>
                          </div>
                          <div className="col-span-1">
                            <p className="text-xs text-[var(--text-muted)]">{formatDate(order.createdAt)}</p>
                          </div>
                          <div className="col-span-1">
                            <p className="text-xs text-[var(--copper-light)]">{formatPrice(order.total)}</p>
                          </div>
                          <div className="col-span-2">
                            <Badge variant={getPaymentBadgeVariant(order.paymentStatus)}>
                              {order.paymentStatus}
                            </Badge>
                          </div>
                          <div className="col-span-2">
                            <Badge variant={getOrderBadgeVariant(order.orderStatus)}>
                              {order.orderStatus}
                            </Badge>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <select
                              value={order.orderStatus}
                              onChange={(e) => handleStatusChange(order as Order & { _docId?: string }, e.target.value as Order['orderStatus'])}
                              disabled={actionLoading === docId}
                              className="h-7 px-2 bg-white/5 border border-white/10 rounded text-[10px] text-[var(--text-muted)] focus:outline-none focus:border-[var(--copper-main)]/50"
                            >
                              {ORDER_STATUSES.map((s) => (
                                <option key={s} value={s} className="bg-[var(--bg-dark)]">{s}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-1.5 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors"
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
                              className="p-1.5 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-light)]"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                            <span>{order.shippingAddress?.name || 'N/A'}</span>
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--copper-light)]">{formatPrice(order.total)}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={getPaymentBadgeVariant(order.paymentStatus)}>
                                {order.paymentStatus}
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
                              className="flex-1 h-8 px-2 bg-white/5 border border-white/10 rounded text-xs text-[var(--text-muted)] focus:outline-none"
                            >
                              {ORDER_STATUSES.map((s) => (
                                <option key={s} value={s} className="bg-[var(--bg-dark)]">{s}</option>
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
                              className="flex-1 h-8 px-3 bg-white/5 border border-white/10 rounded text-xs text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)]/50"
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
                              className="p-1 rounded hover:bg-white/5 text-[var(--text-muted)]"
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
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <div>
                  <h3 className="text-sm font-medium text-[var(--text-light)]">Order Details</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{selectedOrder.orderId}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors"
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
                    <p className="text-sm text-[var(--text-light)]">{selectedOrder.shippingAddress?.name || 'N/A'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{selectedOrder.shippingAddress?.phone}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Total</p>
                    <p className="text-lg font-light text-[var(--copper-light)]">{formatPrice(selectedOrder.total)}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPaymentBadgeVariant(selectedOrder.paymentStatus)}>
                        {selectedOrder.paymentStatus}
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
                      <div key={idx} className="flex items-center gap-3 p-3 rounded bg-white/5">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[var(--text-light)] truncate">{item.title}</p>
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
                    <p className="text-sm text-[var(--text-light)] font-mono bg-white/5 px-3 py-2 rounded inline-block">
                      {selectedOrder.paymentReference}
                    </p>
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
