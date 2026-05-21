'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import {
  User as UserIcon,
  Package,
  MapPin,
  LogOut,
  Settings,
  Camera,
  Save,
  Loader2,
  Plus,
  Trash2,
  Star,
  Copy,
  Check,
  Truck,
} from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { getUserOrders } from '@/services/orderService';
import { formatPrice } from '@/lib/utils';
import { addressSchema, type AddressFormData } from '@/lib/schemas';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthModalStore } from '@/store/authModalStore';
import type { Order, Address } from '@/types';

const ORDER_STATUS_VARIANT: Record<string, 'copper' | 'success' | 'warning' | 'error' | 'neutral' | 'blue' | 'purple'> = {
  placed: 'neutral',
  confirmed: 'blue',
  processing: 'warning',
  shipped: 'purple',
  delivered: 'success',
  cancelled: 'error',
};

export default function AccountClient() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();
  const { setUser } = useAuthStore();
  const { openModal } = useAuthModalStore();

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);

  // Addresses state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormData>({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressActionLoading, setAddressActionLoading] = useState<string | null>(null);

  // Initialize display name from user
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
    }
  }, [user]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      openModal();
      router.replace('/');
    }
  }, [user, loading, openModal, router]);

  // Fetch orders when Orders tab is active
  const handleTabChange = (value: string) => {
    if (value === 'orders' && user) {
      setOrdersLoading(true);
      getUserOrders(user.uid)
        .then((fetchedOrders) => {
          // Sort by createdAt descending
          const sorted = [...fetchedOrders].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setOrders(sorted);
        })
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false));
    }
  };

  // Copy tracking number to clipboard
  const handleCopyTracking = async (orderId: string, trackingNumber: string) => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopiedTrackingId(orderId);
      setTimeout(() => setCopiedTrackingId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = trackingNumber;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedTrackingId(orderId);
      setTimeout(() => setCopiedTrackingId(null), 2000);
    }
  };

  // Save name update
  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;

    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const auth = getFirebaseAuth();
      const db = getFirebaseDb();

      if (!auth || !auth.currentUser) {
        throw new Error('Not authenticated');
      }

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });

      // Update Firestore user document
      if (db) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { name: displayName.trim() });
      }

      // Update local store
      setUser({ ...user, name: displayName.trim() });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    } finally {
      setSaving(false);
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setAvatarError('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be less than 5MB');
      return;
    }

    setAvatarUploading(true);
    setAvatarError('');

    try {
      const storage = getFirebaseStorage();
      const auth = getFirebaseAuth();
      const db = getFirebaseDb();

      if (!storage || !auth?.currentUser) {
        throw new Error('Firebase services not available');
      }

      // Upload to Storage at avatars/{uid}/{filename}
      const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firebase Auth photoURL
      await updateProfile(auth.currentUser, { photoURL: downloadURL });

      // Update Firestore user document
      if (db) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { avatar: downloadURL });
      }

      // Update local store
      setUser({ ...user, avatar: downloadURL });
    } catch (error) {
      setAvatarError(
        error instanceof Error ? error.message : 'Failed to upload avatar'
      );
    } finally {
      setAvatarUploading(false);
      // Reset file input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleLogout = async () => {
    const { logout } = await import('@/services/authService');
    await logout();
    setUser(null);
    router.push('/');
  };

  // Address form handlers
  const resetAddressForm = () => {
    setAddressForm({
      name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    });
    setAddressErrors({});
    setShowAddressForm(false);
  };

  const handleAddressFieldChange = (field: keyof AddressFormData, value: string) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field on change
    if (addressErrors[field]) {
      setAddressErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSaveAddress = async () => {
    if (!user) return;

    // Validate with Zod
    const result = addressSchema.safeParse(addressForm);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AddressFormData, string>> = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof AddressFormData;
        if (field) fieldErrors[field] = err.message;
      });
      setAddressErrors(fieldErrors);
      return;
    }

    setAddressSaving(true);
    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Database not available');

      const newAddress: Address = {
        addressId: crypto.randomUUID(),
        name: result.data.name,
        phone: result.data.phone,
        line1: result.data.line1,
        line2: result.data.line2 || '',
        city: result.data.city,
        state: result.data.state,
        pincode: result.data.pincode,
        country: result.data.country,
        isDefault: !user.addresses || user.addresses.length === 0,
      };

      const userRef = doc(db, 'users', user.uid);
      const updatedAddresses = [...(user.addresses || []), newAddress];
      await updateDoc(userRef, { addresses: updatedAddresses });

      // Update local store
      setUser({ ...user, addresses: updatedAddresses });
      resetAddressForm();
    } catch (error) {
      setAddressErrors({ name: error instanceof Error ? error.message : 'Failed to save address' });
    } finally {
      setAddressSaving(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user) return;

    setAddressActionLoading(addressId);
    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Database not available');

      const updatedAddresses = (user.addresses || []).map((addr) => ({
        ...addr,
        isDefault: addr.addressId === addressId,
      }));

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { addresses: updatedAddresses });

      // Update local store
      setUser({ ...user, addresses: updatedAddresses });
    } catch (error) {
      console.error('Failed to set default address:', error);
    } finally {
      setAddressActionLoading(null);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;

    setAddressActionLoading(addressId);
    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Database not available');

      const updatedAddresses = (user.addresses || []).filter(
        (addr) => addr.addressId !== addressId
      );

      // If we deleted the default, make the first remaining one default
      if (updatedAddresses.length > 0 && !updatedAddresses.some((a) => a.isDefault)) {
        updatedAddresses[0].isDefault = true;
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { addresses: updatedAddresses });

      // Update local store
      setUser({ ...user, addresses: updatedAddresses });
    } catch (error) {
      console.error('Failed to delete address:', error);
    } finally {
      setAddressActionLoading(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen pt-[var(--nav-height)] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Unauthenticated state (briefly shown before redirect)
  if (!user) {
    return (
      <div className="min-h-screen pt-[var(--nav-height)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-muted)] mb-4">Please sign in to view your account</p>
          <Button variant="copper" onClick={() => openModal()}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 space-y-6">
              {/* Avatar */}
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || 'Avatar'}
                      className="w-16 h-16 rounded-full object-cover border border-[var(--copper-main)]/30"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[var(--copper-main)]/20 border border-[var(--copper-main)]/30 flex items-center justify-center">
                      <span className="text-xl font-medium text-[var(--copper-light)]">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-[var(--text-light)]">{user.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                {isAdmin && (
                  <Badge variant="copper" className="mt-2">Admin</Badge>
                )}
              </div>

              {/* Nav */}
              <nav className="space-y-1">
                {isAdmin && (
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
            <Tabs.Root defaultValue="profile" onValueChange={handleTabChange}>
              <Tabs.List className="flex border-b border-[var(--border-subtle)] mb-8">
                <Tabs.Trigger
                  value="profile"
                  className="flex items-center gap-2 px-5 py-3 text-sm text-[var(--text-muted)] border-b-2 border-transparent transition-colors data-[state=active]:text-[var(--copper-light)] data-[state=active]:border-[var(--copper-main)]"
                >
                  <UserIcon size={15} />
                  Profile
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="orders"
                  className="flex items-center gap-2 px-5 py-3 text-sm text-[var(--text-muted)] border-b-2 border-transparent transition-colors data-[state=active]:text-[var(--copper-light)] data-[state=active]:border-[var(--copper-main)]"
                >
                  <Package size={15} />
                  Orders
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="addresses"
                  className="flex items-center gap-2 px-5 py-3 text-sm text-[var(--text-muted)] border-b-2 border-transparent transition-colors data-[state=active]:text-[var(--copper-light)] data-[state=active]:border-[var(--copper-main)]"
                >
                  <MapPin size={15} />
                  Addresses
                </Tabs.Trigger>
              </Tabs.List>

              {/* Profile Tab */}
              <Tabs.Content value="profile">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="glass-card p-8">
                    <h2 className="text-lg font-light text-[var(--text-light)] mb-6">
                      Profile Details
                    </h2>

                    {/* Avatar Section */}
                    <div className="flex items-center gap-6 mb-8 pb-8 border-b border-[var(--border-subtle)]">
                      <div className="relative group">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name || 'Avatar'}
                            className="w-20 h-20 rounded-full object-cover border-2 border-[var(--copper-main)]/30"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-[var(--copper-main)]/20 border-2 border-[var(--copper-main)]/30 flex items-center justify-center">
                            <span className="text-2xl font-medium text-[var(--copper-light)]">
                              {user.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                          className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                          aria-label="Upload avatar"
                        >
                          {avatarUploading ? (
                            <Loader2 size={20} className="text-white animate-spin" />
                          ) : (
                            <Camera size={20} className="text-white" />
                          )}
                        </button>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          aria-label="Choose avatar file"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-[var(--text-light)] font-medium">
                          Profile Photo
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          JPEG, PNG, or WebP. Max 5MB.
                        </p>
                        {avatarError && (
                          <p className="text-xs text-red-400 mt-1">{avatarError}</p>
                        )}
                      </div>
                    </div>

                    {/* Profile Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <Input
                          label="Full Name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter your name"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)] mb-1.5">
                          Email
                        </p>
                        <p className="h-11 flex items-center px-4 text-sm text-[var(--text-light)] bg-white/5 border border-white/10 rounded opacity-70">
                          {user.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)] mb-1.5">
                          Phone
                        </p>
                        <p className="h-11 flex items-center px-4 text-sm text-[var(--text-light)] bg-white/5 border border-white/10 rounded opacity-70">
                          {user.phone || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)] mb-1.5">
                          Member Since
                        </p>
                        <p className="h-11 flex items-center px-4 text-sm text-[var(--text-light)] bg-white/5 border border-white/10 rounded opacity-70">
                          {new Date(user.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="mt-8 flex items-center gap-4">
                      <Button
                        variant="copper"
                        onClick={handleSaveName}
                        disabled={saving || displayName.trim() === user.name}
                        loading={saving}
                      >
                        <Save size={14} />
                        Save
                      </Button>
                      {saveSuccess && (
                        <motion.p
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-xs text-green-400"
                        >
                          Profile updated successfully
                        </motion.p>
                      )}
                      {saveError && (
                        <p className="text-xs text-red-400">{saveError}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Tabs.Content>

              {/* Orders Tab */}
              <Tabs.Content value="orders">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-6">
                    <h2 className="text-lg font-light text-[var(--text-light)]">
                      Order History
                    </h2>
                    {ordersLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="h-6 w-6 rounded-full border-2 border-[var(--copper-main)] border-t-transparent animate-spin" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="glass-card p-12 text-center">
                        <Package size={48} className="text-[var(--text-faint)] mx-auto mb-4" />
                        <p className="text-lg text-[var(--text-muted)] mb-2">No orders yet</p>
                        <p className="text-sm text-[var(--text-faint)] mb-6">
                          When you place an order, it will appear here.
                        </p>
                        <Button variant="copper" onClick={() => router.push('/')}>
                          Start Shopping
                        </Button>
                      </div>
                    ) : (
                      orders.map((order) => (
                        <div key={order.orderId} className="glass-card overflow-hidden">
                          {/* Order Header */}
                          <div className="p-6 border-b border-[var(--border-subtle)]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                <div>
                                  <p className="text-xs text-[var(--text-muted)]">Order ID</p>
                                  <p className="text-sm font-medium text-[var(--text-light)]">
                                    {order.orderId}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-[var(--text-muted)]">Date</p>
                                  <p className="text-sm text-[var(--text-light)]">
                                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <Badge variant={ORDER_STATUS_VARIANT[order.orderStatus] || 'neutral'}>
                                  {order.orderStatus}
                                </Badge>
                                <Badge variant={order.paymentStatus === 'verified' ? 'success' : order.paymentStatus === 'failed' || order.paymentStatus === 'refunded' ? 'error' : 'warning'}>
                                  {order.paymentStatus}
                                </Badge>
                              </div>
                            </div>

                            {/* Tracking Number */}
                            {order.orderStatus === 'shipped' && order.trackingNumber && (
                              <div className="mt-4 flex items-center gap-3 p-3 rounded bg-purple-500/5 border border-purple-500/20">
                                <Truck size={16} className="text-purple-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-[var(--text-muted)]">Tracking Number</p>
                                  <p className="text-sm font-mono text-purple-300 truncate">
                                    {order.trackingNumber}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleCopyTracking(order.orderId, order.trackingNumber!)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-colors"
                                  aria-label="Copy tracking number"
                                >
                                  {copiedTrackingId === order.orderId ? (
                                    <>
                                      <Check size={12} />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      Copy
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Order Items */}
                          <div className="p-6">
                            <div className="space-y-4">
                              {order.products?.map((item, idx) => (
                                <div
                                  key={`${item.productId}-${item.size}-${item.color}-${idx}`}
                                  className="flex gap-4"
                                >
                                  {/* Item Image */}
                                  <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-white/5 border border-[var(--border-subtle)]">
                                    {item.image ? (
                                      <img
                                        src={item.image}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Package size={20} className="text-[var(--text-faint)]" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Item Details */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[var(--text-light)] truncate">
                                      {item.title}
                                    </p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                      {item.size && (
                                        <p className="text-xs text-[var(--text-muted)]">
                                          Size: <span className="text-[var(--text-light)]">{item.size}</span>
                                        </p>
                                      )}
                                      {item.color && (
                                        <p className="text-xs text-[var(--text-muted)]">
                                          Colour: <span className="text-[var(--text-light)]">{item.color}</span>
                                        </p>
                                      )}
                                      <p className="text-xs text-[var(--text-muted)]">
                                        Qty: <span className="text-[var(--text-light)]">{item.quantity}</span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* Item Price */}
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-medium text-[var(--text-light)]">
                                      {formatPrice(item.price * item.quantity)}
                                    </p>
                                    {item.quantity > 1 && (
                                      <p className="text-xs text-[var(--text-muted)]">
                                        {formatPrice(item.price)} each
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Order Totals */}
                            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                              <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between text-[var(--text-muted)]">
                                  <span>Subtotal</span>
                                  <span>{formatPrice(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-[var(--text-muted)]">
                                  <span>Shipping</span>
                                  <span>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</span>
                                </div>
                                <div className="flex justify-between text-[var(--text-muted)]">
                                  <span>GST (5%)</span>
                                  <span>{formatPrice(order.taxes)}</span>
                                </div>
                                <div className="flex justify-between text-[var(--text-light)] font-medium pt-2 border-t border-[var(--border-subtle)]">
                                  <span>Total</span>
                                  <span className="text-[var(--copper-light)]">{formatPrice(order.total)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </Tabs.Content>

              {/* Addresses Tab */}
              <Tabs.Content value="addresses">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-light text-[var(--text-light)]">
                        Saved Addresses
                      </h2>
                      {!showAddressForm && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddressForm(true)}
                        >
                          <Plus size={14} />
                          Add Address
                        </Button>
                      )}
                    </div>

                    {/* Add Address Form */}
                    {showAddressForm && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6"
                      >
                        <h3 className="text-sm font-medium text-[var(--text-light)] mb-4">
                          New Address
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Full Name"
                            value={addressForm.name}
                            onChange={(e) => handleAddressFieldChange('name', e.target.value)}
                            placeholder="Enter full name"
                            error={addressErrors.name}
                          />
                          <Input
                            label="Phone Number"
                            value={addressForm.phone}
                            onChange={(e) => handleAddressFieldChange('phone', e.target.value)}
                            placeholder="10-digit mobile number"
                            error={addressErrors.phone}
                          />
                          <div className="sm:col-span-2">
                            <Input
                              label="Address Line 1"
                              value={addressForm.line1}
                              onChange={(e) => handleAddressFieldChange('line1', e.target.value)}
                              placeholder="House/Flat No., Street, Area"
                              error={addressErrors.line1}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Input
                              label="Address Line 2 (Optional)"
                              value={addressForm.line2 || ''}
                              onChange={(e) => handleAddressFieldChange('line2', e.target.value)}
                              placeholder="Landmark, Locality"
                            />
                          </div>
                          <Input
                            label="City"
                            value={addressForm.city}
                            onChange={(e) => handleAddressFieldChange('city', e.target.value)}
                            placeholder="City"
                            error={addressErrors.city}
                          />
                          <Input
                            label="State"
                            value={addressForm.state}
                            onChange={(e) => handleAddressFieldChange('state', e.target.value)}
                            placeholder="State"
                            error={addressErrors.state}
                          />
                          <Input
                            label="PIN Code"
                            value={addressForm.pincode}
                            onChange={(e) => handleAddressFieldChange('pincode', e.target.value)}
                            placeholder="6-digit PIN code"
                            error={addressErrors.pincode}
                          />
                          <Input
                            label="Country"
                            value={addressForm.country}
                            onChange={(e) => handleAddressFieldChange('country', e.target.value)}
                            placeholder="Country"
                            error={addressErrors.country}
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-6">
                          <Button
                            variant="copper"
                            size="sm"
                            onClick={handleSaveAddress}
                            loading={addressSaving}
                            disabled={addressSaving}
                          >
                            <Save size={14} />
                            Save Address
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={resetAddressForm}
                            disabled={addressSaving}
                          >
                            Cancel
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* Address Cards */}
                    {!user.addresses || user.addresses.length === 0 ? (
                      <div className="glass-card p-12 text-center">
                        <MapPin size={40} className="text-[var(--text-faint)] mx-auto mb-4" />
                        <p className="text-[var(--text-muted)]">No saved addresses</p>
                        {!showAddressForm && (
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setShowAddressForm(true)}
                          >
                            <Plus size={14} />
                            Add Your First Address
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {user.addresses.map((addr) => (
                          <div
                            key={addr.addressId}
                            className={`glass-card p-5 border ${
                              addr.isDefault
                                ? 'border-[var(--copper-main)]/40'
                                : 'border-[var(--border-subtle)]'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-[var(--text-light)]">
                                    {addr.name}
                                  </p>
                                  {addr.isDefault && (
                                    <Badge variant="copper">Default</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                  {addr.line1}
                                  {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city},{' '}
                                  {addr.state} — {addr.pincode}
                                </p>
                                {addr.phone && (
                                  <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Phone: {addr.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                              {!addr.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetDefaultAddress(addr.addressId)}
                                  disabled={addressActionLoading === addr.addressId}
                                  loading={addressActionLoading === addr.addressId}
                                >
                                  <Star size={12} />
                                  Set as Default
                                </Button>
                              )}
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDeleteAddress(addr.addressId)}
                                disabled={addressActionLoading === addr.addressId}
                                loading={addressActionLoading === addr.addressId}
                              >
                                <Trash2 size={12} />
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </div>
      </div>
    </div>
  );
}
