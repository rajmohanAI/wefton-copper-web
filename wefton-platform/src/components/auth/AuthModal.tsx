'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Phone, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  signInWithGoogle,
  signInWithFacebook,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
} from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

type Mode = 'login' | 'signup' | 'forgot';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name too short'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
});

const forgotSchema = z.object({
  email: z.string().email('Invalid email'),
});

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: Mode;
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { setUser } = useAuthStore();

  const loginForm = useForm({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm({ resolver: zodResolver(signupSchema) });
  const forgotForm = useForm({ resolver: zodResolver(forgotSchema) });

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      setUser(user);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebook = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await signInWithFacebook();
      setUser(user);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Facebook sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = loginForm.handleSubmit(async (data) => {
    setLoading(true);
    setError('');
    try {
      const user = await signInWithEmail(data.email, data.password);
      setUser(user);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  });

  const handleSignup = signupForm.handleSubmit(async (data) => {
    setLoading(true);
    setError('');
    try {
      const user = await signUpWithEmail(data.name, data.email, data.password);
      setUser(user);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  });

  const handleForgot = forgotForm.handleSubmit(async (data) => {
    setLoading(true);
    setError('');
    try {
      await resetPassword(data.email);
      setSuccess('Password reset email sent. Check your inbox.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.165, 0.84, 0.44, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Authentication"
          >
            <div className="glass border border-[var(--glass-border)] rounded-xl w-full max-w-md p-8 relative">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-light)] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {/* Logo */}
              <div className="text-center mb-8">
                <p className="text-[var(--copper-light)] font-bold tracking-[4px] uppercase text-sm">
                  WEFTON COPPER
                </p>
                <h2 className="mt-3 text-xl font-light text-[var(--text-light)]">
                  {mode === 'login' && 'Welcome back'}
                  {mode === 'signup' && 'Create account'}
                  {mode === 'forgot' && 'Reset password'}
                </h2>
              </div>

              {/* Error / Success */}
              {error && (
                <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                  {success}
                </div>
              )}

              {/* Social Auth */}
              {mode !== 'forgot' && (
                <>
                  <div className="space-y-3 mb-6">
                    <button
                      onClick={handleGoogle}
                      disabled={loading}
                      className="w-full h-11 flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded text-sm text-[var(--text-light)] hover:bg-white/10 hover:border-white/20 transition-colors disabled:opacity-50"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>

                    <button
                      onClick={handleFacebook}
                      disabled={loading}
                      className="w-full h-11 flex items-center justify-center gap-3 bg-[#1877F2]/10 border border-[#1877F2]/20 rounded text-sm text-[var(--text-light)] hover:bg-[#1877F2]/20 transition-colors disabled:opacity-50"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Continue with Facebook
                    </button>
                  </div>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-3 bg-[var(--bg-dark)] text-xs text-[var(--text-faint)]">
                        or continue with email
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Email Forms */}
              {mode === 'login' && (
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
                      <button type="button" onClick={() => setShowPassword((v) => !v)}>
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                    error={loginForm.formState.errors.password?.message}
                    {...loginForm.register('password')}
                  />
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--copper-light)] transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Button type="submit" variant="copper" fullWidth loading={loading}>
                    Sign In
                  </Button>
                </form>
              )}

              {mode === 'signup' && (
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
                      <button type="button" onClick={() => setShowPassword((v) => !v)}>
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                    error={signupForm.formState.errors.password?.message}
                    {...signupForm.register('password')}
                  />
                  <Button type="submit" variant="copper" fullWidth loading={loading}>
                    Create Account
                  </Button>
                </form>
              )}

              {mode === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-4">
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
              )}

              {/* Mode Switch */}
              <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => setMode('signup')}
                      className="text-[var(--copper-light)] hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => setMode('login')}
                      className="text-[var(--copper-light)] hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setMode('login')}
                    className="text-[var(--copper-light)] hover:underline"
                  >
                    Back to sign in
                  </button>
                )}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
