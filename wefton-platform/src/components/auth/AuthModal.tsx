'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, Mail, Phone, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ConfirmationResult } from 'firebase/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  signInWithGoogle,
  signInWithFacebook,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  sendOTP,
  verifyOTP,
  setupRecaptcha,
} from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { useAuthModalStore } from '@/store/authModalStore';

// ── Zod Schemas ──────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const phoneSchema = z.object({
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Please enter a valid 10-digit Indian phone number'),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

type LoginData = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;
type ForgotData = z.infer<typeof forgotSchema>;
type PhoneData = z.infer<typeof phoneSchema>;
type OtpData = z.infer<typeof otpSchema>;

// ── Error Helpers ────────────────────────────────────────────

function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'An unexpected error occurred. Please try again.';

  const message = error.message.toLowerCase();

  // Popup blocked
  if (message.includes('popup') && (message.includes('blocked') || message.includes('closed'))) {
    return 'Please allow popups for this site and try again.';
  }
  if (message.includes('popup-closed-by-user') || message.includes('cancelled-popup-request')) {
    return 'Sign-in popup was closed. Please try again.';
  }

  // Invalid OTP
  if (message.includes('invalid-verification-code') || message.includes('invalid-verification')) {
    return 'Invalid or expired OTP. Please try again.';
  }

  // User not found
  if (message.includes('user-not-found') || message.includes('no user record')) {
    return 'No account found with this email address.';
  }

  // Wrong password
  if (message.includes('wrong-password') || message.includes('invalid-credential')) {
    return 'Incorrect email or password. Please try again.';
  }

  // Email already in use
  if (message.includes('email-already-in-use')) {
    return 'An account with this email already exists. Please sign in instead.';
  }

  // Too many requests
  if (message.includes('too-many-requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  // Network error
  if (message.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  return error.message || 'An unexpected error occurred. Please try again.';
}

// ── Component ────────────────────────────────────────────────

export default function AuthModal() {
  const { isOpen, closeModal } = useAuthModalStore();
  const { setUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'social' | 'phone' | 'email'>('social');
  const [emailMode, setEmailMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('social');
      setEmailMode('login');
      setPhoneStep('input');
      setError('');
      setSuccess('');
      setShowPassword(false);
      setLoading(false);
      setConfirmationResult(null);
    }
  }, [isOpen]);

  // ── Forms ────────────────────────────────────────────────

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupData>({ resolver: zodResolver(signupSchema) });
  const forgotForm = useForm<ForgotData>({ resolver: zodResolver(forgotSchema) });
  const phoneForm = useForm<PhoneData>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<OtpData>({ resolver: zodResolver(otpSchema) });

  // ── Handlers ─────────────────────────────────────────────

  const handleSuccess = useCallback(
    (user: Parameters<typeof setUser>[0]) => {
      setUser(user);
      closeModal();
    },
    [setUser, closeModal]
  );

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      handleSuccess(user);
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleFacebook = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await signInWithFacebook();
      handleSuccess(user);
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = loginForm.handleSubmit(async (data) => {
    setLoading(true);
    setError('');
    try {
      const user = await signInWithEmail(data.email, data.password);
      handleSuccess(user);
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  });

  const handleSignup = signupForm.handleSubmit(async (data) => {
    setLoading(true);
    setError('');
    try {
      const user = await signUpWithEmail(data.name, data.email, data.password);
      handleSuccess(user);
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  });

  const handleForgot = forgotForm.handleSubmit(async (data) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await resetPassword(data.email);
      setSuccess('Password reset email sent. Check your inbox.');
    } catch (e: unknown) {
      const msg = getAuthErrorMessage(e);
      // Specific handling for user not found during password reset
      if (
        e instanceof Error &&
        (e.message.toLowerCase().includes('user-not-found') ||
          e.message.toLowerCase().includes('no user record'))
      ) {
        setError('No account found with this email address.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  });

  const handleSendOTP = phoneForm.handleSubmit(async (data) => {
    setLoading(true);
    setError('');
    try {
      const recaptchaVerifier = setupRecaptcha('recaptcha-container');
      const phoneNumber = `+91${data.phone}`;
      const result = await sendOTP(phoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setPhoneStep('otp');
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  });

  const handleVerifyOTP = otpForm.handleSubmit(async (data) => {
    if (!confirmationResult) {
      setError('Session expired. Please request a new OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await verifyOTP(confirmationResult, data.otp);
      handleSuccess(user);
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  });

  // ── Render ───────────────────────────────────────────────

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 p-4"
          aria-describedby={undefined}
        >
          <div className="glass border border-[var(--glass-border)] rounded-xl p-12 relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <Dialog.Close asChild>
              <button
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>

            {/* Logo */}
            <div className="text-center mb-8">
              <p className="text-[var(--copper-light)] font-bold tracking-[4px] uppercase text-base">
                WEFTON COPPER
              </p>
              <Dialog.Title className="mt-3 text-2xl font-light text-[var(--text-light)]">
                {emailMode === 'forgot' && activeTab === 'email'
                  ? 'Reset password'
                  : 'Welcome'}
              </Dialog.Title>
            </div>

            {/* Error / Success Messages */}
            {error && (
              <div className="mb-4 p-4 rounded-lg bg-red-500/15 border-2 border-red-500/40 text-sm font-medium text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-4 rounded-lg bg-emerald-500/15 border-2 border-emerald-500/40 text-sm font-medium text-emerald-400">
                {success}
              </div>
            )}

            {/* Tabs */}
            <Tabs.Root
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val as 'social' | 'phone' | 'email');
                setError('');
                setSuccess('');
              }}
            >
              <Tabs.List className="flex gap-1 mb-8 p-1.5 bg-white/5 rounded-lg border border-white/10">
                <Tabs.Trigger
                  value="social"
                  className="flex-1 py-3 px-4 text-sm font-medium tracking-wider uppercase rounded transition-all data-[state=active]:bg-[var(--copper-main)] data-[state=active]:text-white text-[var(--text-muted)] hover:text-[var(--text-light)]"
                >
                  Social
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="phone"
                  className="flex-1 py-3 px-4 text-sm font-medium tracking-wider uppercase rounded transition-all data-[state=active]:bg-[var(--copper-main)] data-[state=active]:text-white text-[var(--text-muted)] hover:text-[var(--text-light)]"
                >
                  Phone
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="email"
                  className="flex-1 py-3 px-4 text-sm font-medium tracking-wider uppercase rounded transition-all data-[state=active]:bg-[var(--copper-main)] data-[state=active]:text-white text-[var(--text-muted)] hover:text-[var(--text-light)]"
                >
                  Email
                </Tabs.Trigger>
              </Tabs.List>

              {/* ── Social Tab ─────────────────────────────── */}
              <Tabs.Content value="social">
                <div className="space-y-3">
                  <button
                    onClick={handleGoogle}
                    disabled={loading}
                    className="w-full h-14 flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-lg text-base text-[var(--text-light)] hover:bg-white/10 hover:border-white/20 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    Continue with Google
                  </button>

                  <button
                    onClick={handleFacebook}
                    disabled={loading}
                    className="w-full h-14 flex items-center justify-center gap-3 bg-[#1877F2]/10 border border-[#1877F2]/20 rounded-lg text-base text-[var(--text-light)] hover:bg-[#1877F2]/20 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    )}
                    Continue with Facebook
                  </button>
                </div>

                <p className="mt-6 text-center text-xs text-[var(--text-faint)]">
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </Tabs.Content>

              {/* ── Phone Tab ──────────────────────────────── */}
              <Tabs.Content value="phone">
                {phoneStep === 'input' ? (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]">
                        Phone Number
                      </label>
                      <div className="flex gap-2 border border-neutral-400 rounded-lg p-1">
                        <div className="flex items-center justify-center h-11 px-3 bg-white/5 border border-neutral-400 rounded text-sm text-[var(--text-muted)]">
                          +91
                        </div>
                        <Input
                          type="tel"
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          inputMode="numeric"
                          className="!border-neutral-400"
                          error={phoneForm.formState.errors.phone?.message}
                          {...phoneForm.register('phone', {
                            onChange: (e: { target: { value: string } }) => {
                              // Strip non-digit characters and limit to 10 digits
                              e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            },
                          })}
                        />
                      </div>
                    </div>
                    <Button type="submit" variant="copper" fullWidth loading={loading}>
                      Send OTP
                    </Button>
                    <p className="text-center text-xs text-[var(--text-faint)]">
                      We&apos;ll send a 6-digit verification code to your phone.
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneStep('input');
                        setError('');
                        otpForm.reset();
                      }}
                      className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors mb-2"
                    >
                      <ArrowLeft size={12} />
                      Change number
                    </button>
                    <p className="text-sm text-[var(--text-light)] mb-2">
                      Enter the 6-digit code sent to{' '}
                      <span className="text-[var(--copper-light)]">
                        +91 {phoneForm.getValues('phone')}
                      </span>
                    </p>
                    <Input
                      label="Verification Code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      error={otpForm.formState.errors.otp?.message}
                      {...otpForm.register('otp')}
                    />
                    <Button type="submit" variant="copper" fullWidth loading={loading}>
                      Verify OTP
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        otpForm.reset();
                        handleSendOTP();
                      }}
                      className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                    >
                      Resend OTP
                    </button>
                  </form>
                )}
              </Tabs.Content>

              {/* ── Email Tab ──────────────────────────────── */}
              <Tabs.Content value="email">
                {emailMode === 'login' && (
                  <>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <Input
                        label="Email"
                        type="email"
                        icon={<Mail size={14} />}
                        error={loginForm.formState.errors.email?.message}
                        {...loginForm.register('email')}
                      />
                      <Input
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        iconRight={
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        }
                        error={loginForm.formState.errors.password?.message}
                        {...loginForm.register('password')}
                      />
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEmailMode('forgot');
                            setError('');
                            setSuccess('');
                          }}
                          className="text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Button type="submit" variant="copper" fullWidth loading={loading}>
                        Sign In
                      </Button>
                    </form>
                    <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
                      Don&apos;t have an account?{' '}
                      <button
                        onClick={() => {
                          setEmailMode('signup');
                          setError('');
                          setSuccess('');
                        }}
                        className="text-[var(--copper-light)] hover:underline"
                      >
                        Sign up
                      </button>
                    </p>
                  </>
                )}

                {emailMode === 'signup' && (
                  <>
                    <form onSubmit={handleSignup} className="space-y-4">
                      <Input
                        label="Full Name"
                        type="text"
                        error={signupForm.formState.errors.name?.message}
                        {...signupForm.register('name')}
                      />
                      <Input
                        label="Email"
                        type="email"
                        icon={<Mail size={14} />}
                        error={signupForm.formState.errors.email?.message}
                        {...signupForm.register('email')}
                      />
                      <Input
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        iconRight={
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        }
                        error={signupForm.formState.errors.password?.message}
                        {...signupForm.register('password')}
                      />
                      <p className="text-xs text-[var(--text-faint)]">
                        Password must be at least 8 characters.
                      </p>
                      <Button type="submit" variant="copper" fullWidth loading={loading}>
                        Create Account
                      </Button>
                    </form>
                    <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
                      Already have an account?{' '}
                      <button
                        onClick={() => {
                          setEmailMode('login');
                          setError('');
                          setSuccess('');
                        }}
                        className="text-[var(--copper-light)] hover:underline"
                      >
                        Sign in
                      </button>
                    </p>
                  </>
                )}

                {emailMode === 'forgot' && (
                  <>
                    <form onSubmit={handleForgot} className="space-y-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailMode('login');
                          setError('');
                          setSuccess('');
                        }}
                        className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors mb-2"
                      >
                        <ArrowLeft size={12} />
                        Back to sign in
                      </button>
                      <p className="text-sm text-[var(--text-light)] mb-2">
                        Enter your email and we&apos;ll send you a link to reset your password.
                      </p>
                      <Input
                        label="Email"
                        type="email"
                        icon={<Mail size={14} />}
                        error={forgotForm.formState.errors.email?.message}
                        {...forgotForm.register('email')}
                      />
                      <Button type="submit" variant="copper" fullWidth loading={loading}>
                        Send Reset Link
                      </Button>
                    </form>
                  </>
                )}
              </Tabs.Content>
            </Tabs.Root>

            {/* Invisible reCAPTCHA container */}
            <div id="recaptcha-container" ref={recaptchaContainerRef} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
