'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { CONTACT_TOPICS, contactSchema, type ContactFormData } from '@/lib/contact';

const fieldClass =
  'w-full bg-[var(--bg-card)] border border-black/15 dark:border-white/15 rounded text-[var(--text-light)] text-sm px-4 placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)]';
const inputBorder = 'border-black/15 dark:border-white/15 bg-[var(--bg-card)]';
const labelClass = 'text-xs font-medium tracking-wider uppercase text-[var(--text-muted)]';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { topic: 'order' },
  });

  const onSubmit = async (data: ContactFormData) => {
    setStatus('sending');
    setServerError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Something went wrong');
      setStatus('sent');
      reset();
    } catch (error) {
      setStatus('idle');
      setServerError(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  if (status === 'sent') {
    return (
      <div className="glass-card p-8 text-center" role="status">
        <CheckCircle className="mx-auto mb-4 text-[var(--copper-light)]" size={32} />
        <h2 className="text-lg font-medium text-[var(--text-light)] mb-2">Message sent</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Thank you. Our team will reply by email within 1–2 business days.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 text-xs tracking-widest uppercase text-[var(--copper-light)] hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="glass-card p-6 md:p-8 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input className={inputBorder} id="contact-name" label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Input
          className={inputBorder}
          id="contact-email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          className={inputBorder}
          id="contact-phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          className={inputBorder}
          id="contact-order"
          label="Order number (optional)"
          error={errors.orderId?.message}
          {...register('orderId')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-topic" className={labelClass}>
          Topic
        </label>
        <select id="contact-topic" className={`${fieldClass} h-11`} {...register('topic')}>
          {CONTACT_TOPICS.map((t) => (
            <option key={t.value} value={t.value} className="bg-[var(--bg-dark)]">
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="contact-message"
          rows={6}
          className={`${fieldClass} py-3`}
          placeholder="How can we help? For a return, mention what was wrong; you can send photos on WhatsApp or by email."
          {...register('message')}
        />
        {errors.message && <p className="text-xs text-red-400">{errors.message.message}</p>}
      </div>

      {/* Honeypot, hidden from people and screen readers */}
      <div className="hidden" aria-hidden>
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      {serverError && (
        <p className="text-sm text-red-400" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" variant="copper" size="lg" loading={status === 'sending'} fullWidth>
        Send Message
      </Button>
    </form>
  );
}
