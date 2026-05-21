'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { emailSchema, type EmailFormData } from '@/lib/schemas';
import { subscribeNewsletter } from '@/services/newsletterService';

export default function NewsletterForm() {
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'loading' | 'success' | 'duplicate'
  >('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const onSubmit = async (data: EmailFormData) => {
    setSubmitStatus('loading');
    setStatusMessage('');

    try {
      const result = await subscribeNewsletter(data.email);

      if (result.success) {
        setSubmitStatus('success');
        setStatusMessage(result.message);
        reset();
      } else {
        // Duplicate email case
        setSubmitStatus('duplicate');
        setStatusMessage(result.message);
      }
    } catch {
      setSubmitStatus('idle');
      setStatusMessage('Something went wrong. Please try again.');
    }
  };

  // Success state
  if (submitStatus === 'success') {
    return (
      <div className="flex items-center gap-2 py-2">
        <CheckCircle size={16} className="text-emerald-400 shrink-0" />
        <p className="text-xs text-emerald-400">{statusMessage}</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 w-full md:w-auto"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="flex gap-2 w-full">
        <div className="relative flex-1 md:w-64">
          <Mail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none"
          />
          <input
            type="email"
            {...register('email')}
            placeholder="Your email address"
            disabled={submitStatus === 'loading'}
            className="w-full h-10 bg-white/5 border border-white/10 rounded pl-9 pr-4 text-sm text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)] transition-colors disabled:opacity-50"
            aria-describedby="newsletter-error"
          />
        </div>
        <button
          type="submit"
          disabled={submitStatus === 'loading'}
          className="h-10 px-5 bg-[var(--copper-main)] text-white text-xs tracking-widest uppercase rounded hover:bg-[var(--copper-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitStatus === 'loading' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Subscribing</span>
            </>
          ) : (
            'Subscribe'
          )}
        </button>
      </div>

      {/* Validation error */}
      {errors.email && (
        <p id="newsletter-error" className="text-xs text-red-400" role="alert">
          {errors.email.message}
        </p>
      )}

      {/* Duplicate email message */}
      {submitStatus === 'duplicate' && statusMessage && (
        <p className="text-xs text-amber-400" role="alert">
          {statusMessage}
        </p>
      )}

      {/* Generic error message */}
      {submitStatus === 'idle' && statusMessage && (
        <p className="text-xs text-red-400" role="alert">
          {statusMessage}
        </p>
      )}
    </form>
  );
}
