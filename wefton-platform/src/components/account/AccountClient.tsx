'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Package, Heart, MapPin, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { logout } from '@/services/authService';
import { getUserOrders } from '@/services/orderService';
import { formatPrice } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import AuthModal from '@/components/auth/AuthModal';
import type { Order } from '@/types';

type Tab = 'profile' | 'orders' | 'wishlist' | 'addresses';

const ORDER_STATUS_VARIANT: Record<string, 'copper' | 'success' | 'warning' | 'error' | 'neutral'> = {
  placed: 'neutral',
  confirmed: 'copper',
  processing: 'warning',
  shipped: 'copper',
  delivered: 'success',
  cancelled: 'error',
};

export default function AccountClient() {
  const router = useRouter();
  const { user, setUser, loading } = useAuthStore();
  const { items: wishlistIds } = useWishlistStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!loading && !user) setShowAuth(true);
  }, [user, loading]);

  useEffect(() => {
    if (user && tab === 'orders') {
      setOrdersLoading(true);
      getUserOrders(user.uid)
        .then(setOrders)
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false));
    }
  }, [user, tab]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-[var(--nav-height)] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen pt-[var(--nav-height)] flex items-center justify-center">
          <div className="text-center">
            <p className="text-[var(--text-muted)] mb-4">Please sign in to view your account</p>
            <Button variant="copper" onClick={() => setShowAuth(true)}>Sign In</Button>
          </div>
        </div>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </>
    );
  }

  const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
  ] as const;

  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 space-y-6">
              {/* Avatar */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--copper-main)]/20 border border-[var(--copper-main)]/30 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-medium text-[var(--copper-light)]">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-medium text-[var(--text-light)]">{user.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                {user.role === 'admin' && (
                  <Badge variant="copper" className="mt-2">Admin</Badge>
                )}
              </div>

              {/* Nav */}
              <nav className="space-y-1">
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

                {user.role === 'admin' && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm text-[var(--text-muted)] hover:text-[var(--copper-light)] hover:bg-white/5 transition-colors"
                  >
                    <Settings size={15} />
                    Admin Panel
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Profile Tab */}
              {tab === 'profile' && (
                <div className="glass-card p-8">
                  <h2 className="text-lg font-light text-[var(--text-light)] mb-6">Profile Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[
                      { label: 'Full Name', value: user.name },
                      { label: 'Email', value: user.email },
                      { label: 'Phone', value: user.phone || 'Not set' },
                      { label: 'Member Since', value: new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs tracking-widest uppercase text-[var(--text-muted)] mb-1">{label}</p>
                        <p className="text-sm text-[var(--text-light)]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {tab === 'orders' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-light text-[var(--text-light)]">Order History</h2>
                  {ordersLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="h-6 w-6 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                      <Package size={40} className="text-[var(--text-faint)] mx-auto mb-4" />
                      <p className="text-[var(--text-muted)]">No orders yet</p>
                      <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
                        Start Shopping
                      </Button>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div key={order.orderId} className="glass-card p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="text-xs text-[var(--text-muted)]">Order ID</p>
                            <p className="text-sm font-medium text-[var(--text-light)]">{order.orderId}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={ORDER_STATUS_VARIANT[order.orderStatus] || 'neutral'}>
                              {order.orderStatus}
                            </Badge>
                            <Badge variant={order.paymentStatus === 'verified' ? 'success' : 'warning'}>
                              {order.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[var(--text-muted)]">
                            {order.products?.length} item(s)
                          </span>
                          <span className="text-[var(--copper-light)] font-medium">
                            {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Wishlist Tab */}
              {tab === 'wishlist' && (
                <div className="glass-card p-8">
                  <h2 className="text-lg font-light text-[var(--text-light)] mb-4">Wishlist</h2>
                  {wishlistIds.length === 0 ? (
                    <div className="text-center py-8">
                      <Heart size={40} className="text-[var(--text-faint)] mx-auto mb-4" />
                      <p className="text-[var(--text-muted)]">Your wishlist is empty</p>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">
                      {wishlistIds.length} item(s) saved
                    </p>
                  )}
                </div>
              )}

              {/* Addresses Tab */}
              {tab === 'addresses' && (
                <div className="glass-card p-8">
                  <h2 className="text-lg font-light text-[var(--text-light)] mb-4">Saved Addresses</h2>
                  {user.addresses?.length === 0 ? (
                    <div className="text-center py-8">
                      <MapPin size={40} className="text-[var(--text-faint)] mx-auto mb-4" />
                      <p className="text-[var(--text-muted)]">No saved addresses</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {user.addresses?.map((addr) => (
                        <div key={addr.addressId} className="p-4 border border-[var(--border-subtle)] rounded-lg">
                          <p className="text-sm font-medium text-[var(--text-light)]">{addr.name}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {addr.line1}, {addr.city}, {addr.state} — {addr.pincode}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
