'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import {
  ShoppingBag,
  Package,
  BarChart3,
  Users,
  IndianRupee,
  Clock,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAllOrders } from '@/services/orderService';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import ProductsTab from './ProductsTab';
import AdminOrders from './AdminOrders';
import type { Order, AdminStats } from '@/types';

function computeAdminStats(orders: Order[], totalProducts: number, totalUsers: number): AdminStats {
  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === 'verified')
    .reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter((o) => o.orderStatus === 'placed').length;
  const pendingPayments = orders.filter((o) => o.paymentStatus === 'uploaded').length;

  return {
    totalOrders,
    totalRevenue,
    totalProducts,
    totalUsers,
    pendingOrders,
    pendingPayments,
  };
}

function AdminStatsPanel({ stats, loading, onRefresh }: { stats: AdminStats; loading: boolean; onRefresh: () => void }) {
  const statCards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders.toString(),
      icon: ShoppingBag,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Revenue',
      value: formatPrice(stats.totalRevenue),
      icon: IndianRupee,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Total Products',
      value: stats.totalProducts.toString(),
      icon: Package,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Total Users',
      value: stats.totalUsers.toString(),
      icon: Users,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Pending Orders',
      value: stats.pendingOrders.toString(),
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Pending Payments',
      value: stats.pendingPayments.toString(),
      icon: CreditCard,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-light text-[var(--text-light)]">Platform Statistics</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          loading={loading}
          aria-label="Refresh statistics"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="glass-card p-5 flex items-start gap-4"
          >
            <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-muted)] tracking-wider uppercase mb-1">
                {stat.label}
              </p>
              <p className={`text-xl font-light ${stat.color} truncate`}>
                {loading ? '—' : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');

  // Admin role check — redirect non-admins to homepage
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const fetchOrders = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    setStatsLoading(true);
    try {
      const allOrders = await getAllOrders();
      setOrders(allOrders);
    } catch {
      setOrders([]);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Show loading spinner while auth state is being determined
  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Compute stats — totalProducts and totalUsers are placeholders until those services are wired
  const stats = computeAdminStats(orders, 0, 0);

  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-[1920px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-light text-[var(--text-light)]">Admin Dashboard</h1>
            <p className="text-sm text-[var(--text-muted)]">Wefton Copper Management</p>
          </div>
        </div>

        {/* Radix UI Tabs */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List
            className="flex items-center gap-1 p-1 mb-8 glass-card w-fit rounded-lg"
            aria-label="Admin dashboard navigation"
          >
            <Tabs.Trigger
              value="orders"
              className="flex items-center gap-2 px-4 py-2.5 rounded text-sm transition-colors data-[state=active]:bg-[var(--copper-main)]/10 data-[state=active]:text-[var(--copper-light)] data-[state=active]:border data-[state=active]:border-[var(--copper-main)]/20 text-[var(--text-muted)] hover:text-[var(--text-light)] hover:bg-white/5"
            >
              <ShoppingBag size={15} />
              Orders
            </Tabs.Trigger>
            <Tabs.Trigger
              value="products"
              className="flex items-center gap-2 px-4 py-2.5 rounded text-sm transition-colors data-[state=active]:bg-[var(--copper-main)]/10 data-[state=active]:text-[var(--copper-light)] data-[state=active]:border data-[state=active]:border-[var(--copper-main)]/20 text-[var(--text-muted)] hover:text-[var(--text-light)] hover:bg-white/5"
            >
              <Package size={15} />
              Products
            </Tabs.Trigger>
            <Tabs.Trigger
              value="stats"
              className="flex items-center gap-2 px-4 py-2.5 rounded text-sm transition-colors data-[state=active]:bg-[var(--copper-main)]/10 data-[state=active]:text-[var(--copper-light)] data-[state=active]:border data-[state=active]:border-[var(--copper-main)]/20 text-[var(--text-muted)] hover:text-[var(--text-light)] hover:bg-white/5"
            >
              <BarChart3 size={15} />
              Stats
            </Tabs.Trigger>
          </Tabs.List>

          {/* Orders Tab */}
          <Tabs.Content value="orders" className="outline-none">
            <AdminOrders />
          </Tabs.Content>

          {/* Products Tab */}
          <Tabs.Content value="products" className="outline-none">
            <ProductsTab />
          </Tabs.Content>

          {/* Stats Tab */}
          <Tabs.Content value="stats" className="outline-none">
            <AdminStatsPanel
              stats={stats}
              loading={statsLoading}
              onRefresh={fetchOrders}
            />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}
