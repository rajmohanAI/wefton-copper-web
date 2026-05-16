'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, CreditCard, CheckCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { createOrder } from '@/services/orderService';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Address } from '@/types';

const addressSchema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().min(10, 'Valid phone required'),
  line1: z.string().min(5, 'Address required'),
  line2: z.string().optional(),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  pincode: z.string().length(6, '6-digit pincode required'),
  country: z.string().min(1),
});

type AddressForm = z.infer<typeof addressSchema>;

type Step = 'address' | 'payment' | 'confirmation';

export default function CheckoutClient() {
  const router = useRouter();
  const { items, getSubtotal, getShipping, getTax, getTotal, discount, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>('address');
  const [address, setAddress] = useState<Address | null>(null);
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'India' },
  });

  if (items.length === 0 && step !== 'confirmation') {
    router.push('/');
    return null;
  }

  const handleAddressSubmit = form.handleSubmit((data) => {
    setAddress({
      addressId: Date.now().toString(),
      name: data.name,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      country: data.country ?? 'India',
    });
    setStep('payment');
  });

  const handlePlaceOrder = async () => {
    if (!address) return;
    setLoading(true);
    setError('');
    try {
      const order = await createOrder(
        user?.uid || 'guest',
        items,
        address,
        discount
      );
      setOrderId(order.orderId);
      clearCart();
      setStep('confirmation');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'confirmation', label: 'Confirmed', icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    step === s.id
                      ? 'bg-[var(--copper-main)] text-white'
                      : STEPS.findIndex((x) => x.id === step) > i
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/10 text-[var(--text-muted)]'
                  }`}
                >
                  {STEPS.findIndex((x) => x.id === step) > i ? (
                    <CheckCircle size={14} />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs tracking-wider uppercase hidden sm:block ${
                    step === s.id ? 'text-[var(--copper-light)]' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-12 h-px bg-white/10" />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Address Step */}
            {step === 'address' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-8"
              >
                <h2 className="text-lg font-light text-[var(--text-light)] mb-6 flex items-center gap-2">
                  <MapPin size={18} className="text-[var(--copper-light)]" />
                  Delivery Address
                </h2>

                <form onSubmit={handleAddressSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Full Name" {...form.register('name')} error={form.formState.errors.name?.message} />
                    <Input label="Phone Number" type="tel" {...form.register('phone')} error={form.formState.errors.phone?.message} />
                  </div>
                  <Input label="Address Line 1" {...form.register('line1')} error={form.formState.errors.line1?.message} />
                  <Input label="Address Line 2 (Optional)" {...form.register('line2')} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input label="City" {...form.register('city')} error={form.formState.errors.city?.message} />
                    <Input label="State" {...form.register('state')} error={form.formState.errors.state?.message} />
                    <Input label="Pincode" {...form.register('pincode')} error={form.formState.errors.pincode?.message} />
                  </div>

                  <Button type="submit" variant="copper" size="lg" fullWidth className="mt-4">
                    Continue to Payment
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Address Summary */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--text-light)] flex items-center gap-2">
                      <MapPin size={14} className="text-[var(--copper-light)]" />
                      Delivering to
                    </h3>
                    <button
                      onClick={() => setStep('address')}
                      className="text-xs text-[var(--copper-light)] hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  {address && (
                    <p className="text-sm text-[var(--text-muted)]">
                      {address.name} · {address.phone}
                      <br />
                      {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} — {address.pincode}
                    </p>
                  )}
                </div>

                {/* QR Payment */}
                <div className="glass-card p-8">
                  <h2 className="text-lg font-light text-[var(--text-light)] mb-2 flex items-center gap-2">
                    <CreditCard size={18} className="text-[var(--copper-light)]" />
                    Payment
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mb-6">
                    Scan the QR code below to complete your payment
                  </p>

                  {/* QR Placeholder */}
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center">
                      <div className="text-center text-gray-400 text-xs p-4">
                        <p className="font-medium text-gray-600 mb-1">UPI QR Code</p>
                        <p>Configure your UPI ID in admin settings</p>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-2xl font-medium text-[var(--copper-light)]">
                        {formatPrice(getTotal())}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Pay this exact amount
                      </p>
                    </div>

                    <div className="w-full space-y-3">
                      <p className="text-xs text-[var(--text-muted)] text-center">
                        After payment, click the button below to confirm your order.
                        Our team will verify and process within 24 hours.
                      </p>

                      {error && (
                        <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                          {error}
                        </div>
                      )}

                      <Button
                        variant="copper"
                        size="lg"
                        fullWidth
                        onClick={handlePlaceOrder}
                        loading={loading}
                      >
                        I&apos;ve Completed Payment
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Confirmation Step */}
            {step === 'confirmation' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle size={32} className="text-emerald-400" />
                </motion.div>

                <h2 className="text-2xl font-light text-[var(--text-light)] mb-2">
                  Order Placed!
                </h2>
                <p className="text-[var(--text-muted)] mb-4">
                  Thank you for your order. We&apos;ll verify your payment and confirm shortly.
                </p>
                <p className="text-xs text-[var(--copper-light)] font-medium tracking-wider mb-8">
                  Order ID: {orderId}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button variant="copper" onClick={() => router.push('/account/orders')}>
                    Track Order
                  </Button>
                  <Button variant="secondary" onClick={() => router.push('/')}>
                    Continue Shopping
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          {step !== 'confirmation' && (
            <div className="glass-card p-6 h-fit sticky top-24">
              <h3 className="text-sm font-medium tracking-widest uppercase text-[var(--text-light)] mb-6">
                Order Summary
              </h3>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.variantId || item.productId} className="flex gap-3">
                    <div className="relative w-14 h-16 rounded overflow-hidden bg-[var(--bg-darker)] flex-shrink-0">
                      <Image src={item.image} alt={item.title} fill className="object-cover" sizes="56px" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--copper-main)] text-white text-[9px] flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text-light)] truncate">{item.title}</p>
                      {item.size && <p className="text-[10px] text-[var(--text-muted)]">Size: {item.size}</p>}
                      <p className="text-xs text-[var(--copper-light)] mt-1">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-xs border-t border-[var(--border-subtle)] pt-4">
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Subtotal</span><span>{formatPrice(getSubtotal())}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span><span>-{formatPrice((getSubtotal() * discount) / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Shipping</span><span>{getShipping() === 0 ? 'Free' : formatPrice(getShipping())}</span>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>GST (5%)</span><span>{formatPrice(getTax())}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-[var(--text-light)] pt-2 border-t border-[var(--border-subtle)]">
                  <span>Total</span>
                  <span className="text-[var(--copper-light)]">{formatPrice(getTotal())}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
