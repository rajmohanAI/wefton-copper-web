'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  Plus,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAllOrders, updateOrderStatus } from '@/services/orderService';
import { formatPrice } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { Order } from '@/types';

type AdminTab = 'overview' | 'orders' | 'products' | 'users';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      setOrdersLoading(true);
      getAllOrders()
        .then(setOrders)
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false));
    }
  }, [user]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
      </div>
    );
  }

  const pendingPayments = orders.filter((o) => o.paymentStatus === 'uploaded').length;
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === 'verified')
    .reduce((s, o) => s + o.total, 0);

  const STATS = [
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: 'text-blue-400' },
    { label: 'Revenue', value: formatPrice(totalRevenue), icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Pending Payments', value: pendingPayments, icon: Clock, color: 'text-amber-400' },
    { label: 'Delivered', value: orders.filter((o) => o.orderStatus === 'delivered').length, icon: CheckCircle, color: 'text-[var(--copper-light)]' },
  ];

  const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'users', label: 'Users', icon: Users },
  ] as const;

  const handleApprovePayment = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'confirmed', 'verified');
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? { ...o, paymentStatus: 'verified', orderStatus: 'confirmed' }
            : o
        )
      );
    } catch {
      alert('Failed to update order');
    }
  };

  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-light text-[var(--text-light)]">Admin Dashboard</h1>
            <p className="text-sm text-[var(--text-muted)]">Wefton Copper Management</p>
          </div>
          <Button variant="copper" onClick={() => router.push('/admin/products/new')}>
            <Plus size={14} /> Add Product
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-card p-4 space-y-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm transition-colors ${
                    tab === id
                      ? 'bg-[var(--copper-main)]/10 text-[var(--copper-light)] border border-[var(--copper-main)]/20'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-light)] hover:bg-white/5'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-4">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Overview */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {STATS.map((stat) => (
                      <div key={stat.label} className="glass-card p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-[var(--text-muted)] tracking-wider uppercase">
                            {stat.label}
                          </p>
                          <stat.icon size={16} className={stat.color} />
                        </div>
                        <p className={`text-2xl font-light ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent Orders */}
                  <div className="glass-card p-6">
                    <h3 className="text-sm font-medium text-[var(--text-light)] mb-4 flex items-center gap-2">
                      <TrendingUp size={14} className="text-[var(--copper-light)]" />
                      Recent Orders
                    </h3>
                    <div className="space-y-3">
                      {orders.slice(0, 5).map((order) => (
                        <div key={order.orderId} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                          <div>
                            <p className="text-xs font-medium text-[var(--text-light)]">{order.orderId}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{order.products?.length} items</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[var(--copper-light)]">{formatPrice(order.total)}</span>
                            <Badge variant={order.paymentStatus === 'verified' ? 'success' : 'warning'}>
                              {order.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Orders */}
              {tab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-light text-[var(--text-light)]">All Orders</h2>
                    {pendingPayments > 0 && (
                      <Badge variant="warning">{pendingPayments} pending verification</Badge>
                    )}
                  </div>

                  {ordersLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="h-6 w-6 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div key={order.orderId} className="glass-card p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-[var(--text-light)]">{order.orderId}</p>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                {order.products?.length} items · {formatPrice(order.total)}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {order.shippingAddress?.name} · {order.shippingAddress?.city}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant={order.paymentStatus === 'verified' ? 'success' : order.paymentStatus === 'uploaded' ? 'warning' : 'neutral'}>
                                {order.paymentStatus}
                              </Badge>
                              <Badge variant="neutral">{order.orderStatus}</Badge>

                              {order.paymentStatus === 'uploaded' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleApprovePayment(order.orderId)}
                                >
                                  Approve Payment
                                </Button>
                              )}

                              <select
                                value={order.orderStatus}
                                onChange={(e) =>
                                  updateOrderStatus(order.orderId, e.target.value as Order['orderStatus'])
                                    .then(() =>
                                      setOrders((prev) =>
                                        prev.map((o) =>
                                          o.orderId === order.orderId
                                            ? { ...o, orderStatus: e.target.value as Order['orderStatus'] }
                                            : o
                                        )
                                      )
                                    )
                                }
                                className="h-8 px-2 bg-white/5 border border-white/10 rounded text-xs text-[var(--text-muted)] focus:outline-none"
                              >
                                {['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
                                  <option key={s} value={s} className="bg-[var(--bg-dark)]">{s}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Products */}
              {tab === 'products' && (
                <div className="glass-card p-8 text-center">
                  <Package size={40} className="text-[var(--text-faint)] mx-auto mb-4" />
                  <p className="text-[var(--text-muted)] mb-4">Product management coming soon</p>
                  <Button variant="copper" onClick={() => router.push('/admin/products/new')}>
                    <Plus size={14} /> Add First Product
                  </Button>
                </div>
              )}

              {/* Users */}
              {tab === 'users' && (
                <div className="glass-card p-8 text-center">
                  <Users size={40} className="text-[var(--text-faint)] mx-auto mb-4" />
                  <p className="text-[var(--text-muted)]">User management coming soon</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
