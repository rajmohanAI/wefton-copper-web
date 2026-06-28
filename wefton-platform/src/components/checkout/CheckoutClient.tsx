'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { lookupPincode } from '@/lib/pincode';
import { MapPin, CreditCard, CheckCircle, Check, Upload, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';
import { addressSchema, fileUploadSchema, type AddressFormData } from '@/lib/schemas';
import { createOrder, uploadPaymentScreenshot } from '@/services/orderService';
import { formatPrice } from '@/lib/utils';
import { trackPurchase } from '@/lib/analytics';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Address } from '@/types';

type Step = 'address' | 'payment' | 'confirmation';

const STEPS = [
  { id: 'address' as const, label: 'Address', icon: MapPin },
  { id: 'payment' as const, label: 'Payment', icon: CreditCard },
  { id: 'confirmation' as const, label: 'Confirmed', icon: CheckCircle },
];

export default function CheckoutClient() {
  const router = useRouter();
  const { items, getSubtotal, getShipping, getTax, getTotal, discount, clearCart } =
    useCartStore();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('address');
  const [confirmedAddress, setConfirmedAddress] = useState<Address | null>(null);
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);

  // Step 2: QR Payment state
  const [orderCreating, setOrderCreating] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [confirmedItems, setConfirmedItems] = useState<typeof items>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const orderCreationRef = useRef(false);

  // Saved addresses from user profile
  const savedAddresses: Address[] = user?.addresses ?? [];

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
  });

  // Redirect if cart is empty (except on confirmation step)
  useEffect(() => {
    if (items.length === 0 && step !== 'confirmation') {
      router.push('/');
    }
  }, [items.length, step, router]);

  // Ensure cart is cleared when reaching confirmation step (safety net)
  useEffect(() => {
    if (step === 'confirmation' && items.length > 0) {
      clearCart();
    }
  }, [step, items.length, clearCart]);

  // Create order when reaching Step 2 (QR Payment)
  const handleCreateOrder = async () => {
    if (orderCreationRef.current || orderCreated || !confirmedAddress) return;
    orderCreationRef.current = true;
    setOrderCreating(true);
    setError('');
    try {
      const order = await createOrder(
        user?.uid || 'guest',
        items,
        confirmedAddress,
        discount
      );
      setOrderId(order.orderId);
      setOrderTotal(order.total);
      setOrderCreated(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create order');
      orderCreationRef.current = false;
    } finally {
      setOrderCreating(false);
    }
  };

  useEffect(() => {
    if (step === 'payment' && !orderCreated && confirmedAddress) {
      handleCreateOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, orderCreated, confirmedAddress]);

  if (items.length === 0 && step !== 'confirmation') {
    return null;
  }

  // Validate file upload (client-side)
  const validateFile = (file: File): string | null => {
    const result = fileUploadSchema.safeParse({ type: file.type, size: file.size });
    if (!result.success) {
      return 'Please upload a JPEG, PNG, or WebP image under 10 MB';
    }
    return null;
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      setSelectedFile(null);
      // Reset the input
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setSelectedFile(file);
  };

  // Handle screenshot upload and advance to Step 3
  const handleUploadScreenshot = async () => {
    if (!selectedFile || !paymentReference.trim() || !orderId) return;
    setUploading(true);
    setError('');
    try {
      await uploadPaymentScreenshot(orderId, selectedFile, paymentReference.trim());
      setConfirmedItems([...items]);

      // GA4: Track purchase event after successful checkout
      trackPurchase({
        transaction_id: orderId,
        value: orderTotal,
        shipping: getShipping(),
        items: items.map((item) => ({
          item_id: item.productId,
          item_name: item.title,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      clearCart();
      setStep('confirmation');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Handle selecting a saved address — pre-fill the form
  const handleSelectSavedAddress = (address: Address) => {
    setSelectedAddressId(address.addressId);
    form.reset({
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country || 'India',
    });
  };

  // Handle address form submission with Zod validation
  const handleAddressSubmit = form.handleSubmit(async (data) => {
    // Prevent submission if Terms of Service not accepted
    if (!tosAccepted) {
      setError('Please accept the Terms of Service and Refund Policy to continue.');
      return;
    }

    const newAddress: Address = {
      addressId: selectedAddressId || crypto.randomUUID(),
      name: data.name,
      phone: data.phone,
      line1: data.line1,
      line2: data.line2,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      country: data.country ?? 'India',
    };

    // Save address to Firestore if checkbox is checked and it's a new address
    if (saveAddress && !selectedAddressId && user?.uid) {
      setSavingAddress(true);
      try {
        const db = getFirebaseDb();
        if (db) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            addresses: arrayUnion(newAddress),
          });
        }
      } catch (err) {
        console.error('[Wefton Checkout] Failed to save address:', err);
        // Non-blocking — continue to payment even if save fails
      } finally {
        setSavingAddress(false);
      }
    }

    setConfirmedAddress(newAddress);
    setStep('payment');
  });

  // Navigate back from payment to address — preserves form data
  const handleBackToAddress = () => {
    setStep('address');
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-dark)]">
      <div className="w-full px-6 md:px-10 lg:px-16 py-12">
        <div className="w-full">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    step === s.id
                      ? 'bg-[var(--copper-main)] text-white'
                      : currentStepIndex > i
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/10 text-[var(--text-muted)]'
                  }`}
                >
                  {currentStepIndex > i ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span
                  className={`text-xs tracking-wider uppercase hidden sm:block ${
                    step === s.id
                      ? 'text-[var(--copper-light)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-12 h-px ${
                    currentStepIndex > i ? 'bg-emerald-500' : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Delivery Address */}
            {step === 'address' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Saved Addresses */}
                {savedAddresses.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="text-sm font-medium tracking-wider uppercase text-[var(--text-light)] mb-4">
                      Saved Addresses
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.addressId}
                          type="button"
                          onClick={() => handleSelectSavedAddress(addr)}
                          className={`text-left p-4 rounded-lg border transition-all duration-200 ${
                            selectedAddressId === addr.addressId
                              ? 'border-[var(--copper-main)] bg-[var(--copper-main)]/5'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-light)] truncate">
                                {addr.name}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                {addr.phone}
                              </p>
                              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                                {addr.line1}
                                {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city},{' '}
                                {addr.state} — {addr.pincode}
                              </p>
                            </div>
                            {selectedAddressId === addr.addressId && (
                              <div className="w-5 h-5 rounded-full bg-[var(--copper-main)] flex items-center justify-center flex-shrink-0 ml-2">
                                <Check size={12} className="text-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Address Form */}
                <div className="glass-card p-8">
                  <h2 className="text-lg font-light text-[var(--text-light)] mb-6 flex items-center gap-2">
                    <MapPin size={18} className="text-[var(--copper-light)]" />
                    {savedAddresses.length > 0
                      ? 'Edit or Enter New Address'
                      : 'Delivery Address'}
                  </h2>

                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Full Name"
                        placeholder="Enter your full name"
                        {...form.register('name')}
                        error={form.formState.errors.name?.message}
                      />
                      <Input
                        label="Phone Number"
                        type="tel"
                        placeholder="10-digit mobile number"
                        {...form.register('phone')}
                        error={form.formState.errors.phone?.message}
                      />
                    </div>
                    <Input
                      label="Address Line 1"
                      placeholder="House no., Street, Area"
                      {...form.register('line1')}
                      error={form.formState.errors.line1?.message}
                    />
                    <Input
                      label="Address Line 2 (Optional)"
                      placeholder="Landmark, Apartment name"
                      {...form.register('line2')}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="PIN Code"
                        placeholder="6-digit PIN"
                        {...form.register('pincode', {
                          onChange: async (e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            form.setValue('pincode', val);
                            if (val.length === 6) {
                              const result = await lookupPincode(val);
                              if (result) {
                                form.setValue('city', result.city);
                                form.setValue('state', result.state);
                                form.clearErrors('city');
                                form.clearErrors('state');
                              }
                            }
                          },
                        })}
                        error={form.formState.errors.pincode?.message}
                        maxLength={6}
                      />
                      <Input
                        label="City"
                        placeholder="Auto-filled from PIN"
                        {...form.register('city')}
                        error={form.formState.errors.city?.message}
                        readOnly
                        className="bg-[var(--bg-card)] cursor-not-allowed"
                      />
                      <Input
                        label="State"
                        placeholder="Auto-filled from PIN"
                        {...form.register('state')}
                        error={form.formState.errors.state?.message}
                        readOnly
                        className="bg-[var(--bg-card)] cursor-not-allowed"
                      />
                    </div>
                    <Input
                      label="Country"
                      {...form.register('country')}
                      disabled
                    />

                    {/* Save Address Checkbox — only show for new addresses */}
                    {!selectedAddressId && (
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={saveAddress}
                            onChange={(e) => setSaveAddress(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-5 h-5 rounded border border-white/20 bg-white/5 peer-checked:bg-[var(--copper-main)] peer-checked:border-[var(--copper-main)] transition-all flex items-center justify-center">
                            {saveAddress && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-[var(--text-muted)] group-hover:text-[var(--text-light)] transition-colors">
                          Save this address for future orders
                        </span>
                      </label>
                    )}

                    {/* Terms of Service Acknowledgment */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5">
                        <input
                          type="checkbox"
                          checked={tosAccepted}
                          onChange={(e) => setTosAccepted(e.target.checked)}
                          className="sr-only peer"
                          aria-required="true"
                        />
                        <div className="w-5 h-5 rounded border border-white/20 bg-white/5 peer-checked:bg-[var(--copper-main)] peer-checked:border-[var(--copper-main)] transition-all flex items-center justify-center">
                          {tosAccepted && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-[var(--text-muted)] group-hover:text-[var(--text-light)] transition-colors">
                        I agree to the{' '}
                        <Link href="/terms" target="_blank" className="text-[var(--copper-light)] hover:underline">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/refund-policy" target="_blank" className="text-[var(--copper-light)] hover:underline">
                          Refund Policy
                        </Link>
                      </span>
                    </label>

                    <Button
                      type="submit"
                      variant="copper"
                      size="lg"
                      fullWidth
                      className="mt-4"
                      loading={savingAddress}
                      disabled={!tosAccepted}
                    >
                      Continue to Payment
                    </Button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Step 2: Payment */}
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
                      onClick={handleBackToAddress}
                      className="text-xs text-[var(--copper-light)] hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  {confirmedAddress && (
                    <p className="text-sm text-[var(--text-muted)]">
                      {confirmedAddress.name} · {confirmedAddress.phone}
                      <br />
                      {confirmedAddress.line1}
                      {confirmedAddress.line2
                        ? `, ${confirmedAddress.line2}`
                        : ''}
                      , {confirmedAddress.city}, {confirmedAddress.state} —{' '}
                      {confirmedAddress.pincode}
                    </p>
                  )}
                </div>

                {/* QR Payment */}
                <div className="glass-card p-8">
                  <h2 className="text-lg font-light text-[var(--text-light)] mb-2 flex items-center gap-2">
                    <CreditCard size={18} className="text-[var(--copper-light)]" />
                    UPI Payment
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mb-6">
                    Scan the QR code below to complete your payment via UPI
                  </p>

                  {orderCreating ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <span className="h-8 w-8 rounded-full border-2 border-[var(--copper-light)] border-t-transparent animate-spin" />
                      <p className="text-sm text-[var(--text-muted)]">Creating your order…</p>
                    </div>
                  ) : orderCreated ? (
                    <div className="flex flex-col items-center gap-6">
                      {/* QR Code Image */}
                      {process.env.NEXT_PUBLIC_UPI_QR_IMAGE_URL ? (
                        <div className="w-52 h-52 bg-white rounded-xl flex items-center justify-center overflow-hidden p-2">
                          <Image
                            src={process.env.NEXT_PUBLIC_UPI_QR_IMAGE_URL}
                            alt="UPI QR Code for payment"
                            width={192}
                            height={192}
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-52 h-52 bg-white rounded-xl flex items-center justify-center">
                          <div className="text-center text-gray-400 text-xs p-4">
                            <p className="font-medium text-gray-600 mb-1">
                              UPI QR Code
                            </p>
                            <p>QR code not configured</p>
                          </div>
                        </div>
                      )}

                      {/* UPI ID */}
                      {process.env.NEXT_PUBLIC_UPI_ID && (
                        <div className="text-center">
                          <p className="text-xs text-[var(--text-muted)] mb-1">UPI ID</p>
                          <p className="text-sm font-medium text-[var(--text-light)] bg-white/5 px-4 py-2 rounded border border-white/10">
                            {process.env.NEXT_PUBLIC_UPI_ID}
                          </p>
                        </div>
                      )}

                      {/* Amount and Order ID */}
                      <div className="text-center space-y-2">
                        <p className="text-2xl font-medium text-[var(--copper-light)]">
                          {formatPrice(orderTotal)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Pay this exact amount
                        </p>
                        <div className="bg-white/5 border border-white/10 rounded px-4 py-2 mt-2">
                          <p className="text-xs text-[var(--text-muted)]">Order ID (use as payment reference)</p>
                          <p className="text-sm font-mono font-medium text-[var(--copper-light)] mt-1">
                            {orderId}
                          </p>
                        </div>
                      </div>

                      {/* Payment Instructions */}
                      <div className="w-full bg-white/5 border border-white/10 rounded-lg p-4">
                        <h4 className="text-xs font-medium text-[var(--text-light)] mb-2 uppercase tracking-wider">
                          Payment Instructions
                        </h4>
                        <ol className="text-xs text-[var(--text-muted)] space-y-1.5 list-decimal list-inside">
                          <li>Scan the QR code above or use the UPI ID to pay</li>
                          <li>Enter the exact amount: <span className="text-[var(--copper-light)] font-medium">{formatPrice(orderTotal)}</span></li>
                          <li>Add your Order ID <span className="font-mono text-[var(--copper-light)]">{orderId}</span> in the payment note/remark</li>
                          <li>Take a screenshot of the payment confirmation</li>
                          <li>Upload the screenshot below and enter the UPI transaction reference</li>
                        </ol>
                      </div>

                      {/* File Upload Section */}
                      <div className="w-full space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-[var(--text-light)] uppercase tracking-wider">
                            Payment Screenshot
                          </label>
                          <div
                            className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                              selectedFile
                                ? 'border-emerald-500/50 bg-emerald-500/5'
                                : fileError
                                ? 'border-red-500/50 bg-red-500/5'
                                : 'border-white/20 hover:border-[var(--copper-main)]/50 bg-white/5'
                            }`}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleFileChange}
                              className="sr-only"
                            />
                            {selectedFile ? (
                              <div className="flex items-center justify-center gap-2">
                                <CheckCircle size={16} className="text-emerald-400" />
                                <span className="text-sm text-emerald-400">{selectedFile.name}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload size={24} className="text-[var(--text-muted)]" />
                                <p className="text-sm text-[var(--text-muted)]">
                                  Click to upload screenshot
                                </p>
                                <p className="text-[10px] text-[var(--text-muted)]">
                                  JPEG, PNG, or WebP · Max 10 MB
                                </p>
                              </div>
                            )}
                          </div>
                          {fileError && (
                            <div className="flex items-center gap-2 text-xs text-red-400">
                              <AlertCircle size={12} />
                              <span>{fileError}</span>
                            </div>
                          )}
                        </div>

                        {/* UPI Reference Input */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-[var(--text-light)] uppercase tracking-wider">
                            UPI Transaction Reference
                          </label>
                          <input
                            type="text"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="Enter UPI transaction ID / UTR number"
                            className="w-full h-10 px-4 rounded bg-white/5 border border-white/10 text-sm text-[var(--text-light)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--copper-main)] transition-colors"
                          />
                        </div>

                        {error && (
                          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                            <AlertCircle size={14} />
                            {error}
                          </div>
                        )}

                        <Button
                          variant="copper"
                          size="lg"
                          fullWidth
                          onClick={handleUploadScreenshot}
                          loading={uploading}
                          disabled={!selectedFile || !paymentReference.trim() || uploading}
                        >
                          Submit Payment Proof
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Error state — order creation failed */
                    <div className="flex flex-col items-center gap-4 py-8">
                      {error && (
                        <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400 w-full text-center">
                          {error}
                        </div>
                      )}
                      <Button
                        variant="copper"
                        size="md"
                        onClick={() => {
                          orderCreationRef.current = false;
                          handleCreateOrder();
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {step === 'confirmation' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="glass-card p-8 sm:p-12"
              >
                {/* Success Animation */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                    className="relative w-20 h-20 mx-auto mb-6"
                  >
                    {/* Outer ring pulse */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ delay: 0.5, duration: 1, repeat: 2, repeatType: 'loop' }}
                      className="absolute inset-0 rounded-full bg-emerald-500/20"
                    />
                    {/* Main circle */}
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center">
                      <motion.div
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                      >
                        <CheckCircle size={36} className="text-emerald-400" />
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl font-light text-[var(--text-light)] mb-2"
                  >
                    Order Placed Successfully!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-sm text-[var(--text-muted)]"
                  >
                    Thank you for your order. We&apos;ll verify your payment and confirm shortly.
                  </motion.p>
                </div>

                {/* Order Details */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-5 mb-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        Order ID
                      </p>
                      <p className="text-sm font-mono font-medium text-[var(--copper-light)]">
                        {orderId}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        Total Paid
                      </p>
                      <p className="text-sm font-medium text-[var(--text-light)]">
                        {formatPrice(orderTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        Estimated Delivery
                      </p>
                      <p className="text-sm font-medium text-[var(--text-light)]">
                        5–7 business days
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Itemised Summary */}
                {confirmedItems.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-5 mb-8"
                  >
                    <h4 className="text-xs font-medium text-[var(--text-light)] uppercase tracking-wider mb-4">
                      Items Ordered
                    </h4>
                    <div className="space-y-3">
                      {confirmedItems.map((item, index) => (
                        <motion.div
                          key={item.variantId || item.productId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + index * 0.1 }}
                          className="flex items-center gap-3"
                        >
                          <div className="relative w-12 h-14 rounded-md overflow-hidden bg-[var(--bg-darker)] flex-shrink-0 border border-white/5">
                            <Image
                              src={item.image}
                              alt={item.title}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[var(--text-light)] truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              {item.size && `Size: ${item.size}`}
                              {item.size && item.color && ' · '}
                              {item.color && `Colour: ${item.color}`}
                              {(item.size || item.color) && ' · '}
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-[var(--copper-light)] flex-shrink-0">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Total row */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                      <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                        Total Paid
                      </span>
                      <span className="text-sm font-medium text-[var(--copper-light)]">
                        {formatPrice(orderTotal)}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="flex flex-col sm:flex-row gap-3 justify-center"
                >
                  <Button
                    variant="copper"
                    onClick={() => router.push('/account')}
                  >
                    Track Order
                  </Button>
                  <Button variant="secondary" onClick={() => router.push('/')}>
                    Continue Shopping
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          {step !== 'confirmation' && (
            <div className="glass-card p-6 h-fit sticky top-24">
              <h3 className="text-sm font-medium tracking-widest uppercase text-[var(--text-light)] mb-6">
                Order Summary
              </h3>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div
                    key={item.variantId || item.productId}
                    className="flex gap-3"
                  >
                    <div className="relative w-14 h-16 rounded overflow-hidden bg-[var(--bg-darker)] flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--copper-main)] text-white text-[9px] flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text-light)] truncate">
                        {item.title}
                      </p>
                      {item.size && (
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Size: {item.size}
                        </p>
                      )}
                      {item.color && (
                        <p className="text-[10px] text-[var(--text-muted)]">
                          Color: {item.color}
                        </p>
                      )}
                      <p className="text-xs text-[var(--copper-light)] mt-1">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-xs border-t border-[var(--border-subtle)] pt-4">
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Subtotal</span>
                  <span>{formatPrice(getSubtotal())}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span>
                      -{formatPrice((getSubtotal() * discount) / 100)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Shipping</span>
                  <span>
                    {getShipping() === 0 ? 'Free' : formatPrice(getShipping())}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>GST (5%)</span>
                  <span>{formatPrice(getTax())}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-[var(--text-light)] pt-2 border-t border-[var(--border-subtle)]">
                  <span>Total</span>
                  <span className="text-[var(--copper-light)]">
                    {formatPrice(getTotal())}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
