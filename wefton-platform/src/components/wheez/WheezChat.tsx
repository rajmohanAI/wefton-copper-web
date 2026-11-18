'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModalStore } from '@/store/authModalStore';
import { getFirebaseAuth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import {
  COMPLAINT_TOPICS,
  MAX_DETAILS,
  MAX_IMAGES,
  REPORT_TOPICS,
  RETURN_OUTCOMES,
  RETURN_REASONS,
  SUGGESTION_TOPICS,
  WHEEZ_INTENTS,
  WHEEZ_NAME,
  isAllowedImage,
  labelFor,
  type WheezIntent,
  type WheezOrderSummary,
  type WheezRequestType,
} from '@/lib/wheez';
import { playWheezClick } from '@/lib/wheezSound';

// ============================================================
// Wheez — guided support chat (WC-Issue-13). The customer answers by
// picking options; a text box appears only where a request needs a
// description. Used in the floating launcher and on the Contact Us page.
// ============================================================

type Option = { value: string; label: string };
type Message = { id: number; from: 'bot' | 'user'; content: ReactNode };

/** What the chat is waiting for next. */
type Step =
  | { kind: 'menu' }
  | { kind: 'order_lookup'; intent: 'order_status' | 'return' }
  | { kind: 'pick_order'; intent: 'order_status' | 'return'; orders: WheezOrderSummary[] }
  | { kind: 'after_status' }
  | { kind: 'return_items'; order: WheezOrderSummary }
  | { kind: 'return_reason' }
  | { kind: 'return_outcome' }
  | { kind: 'return_photos' }
  | { kind: 'topic'; type: Exclude<WheezRequestType, 'return'> }
  | { kind: 'details' }
  | { kind: 'email' }
  | { kind: 'done' };

interface Draft {
  type?: WheezRequestType;
  topic?: string;
  outcome?: string;
  orderId?: string;
  contact?: string;
  items?: number[];
  details?: string;
  email?: string;
}

const TOPICS: Record<Exclude<WheezRequestType, 'return'>, readonly Option[]> = {
  complaint: COMPLAINT_TOPICS,
  suggestion: SUGGESTION_TOPICS,
  report: REPORT_TOPICS,
};

const TOPIC_QUESTION: Record<Exclude<WheezRequestType, 'return'>, string> = {
  complaint: 'Sorry to hear that. What is it about?',
  suggestion: 'We love ideas. What is your suggestion about?',
  report: 'Thanks for helping us. What did you notice?',
};

const DETAILS_QUESTION: Record<WheezRequestType, string> = {
  complaint: 'Please describe what happened, with your order number if it is about an order.',
  suggestion: 'Please tell us your suggestion.',
  report: 'Please tell us what is wrong and where you saw it.',
  return: 'Anything else we should know? (optional)',
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await getFirebaseAuth()?.currentUser?.getIdToken().catch(() => undefined);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function OrderCard({ order }: { order: WheezOrderSummary }) {
  return (
    <div className="space-y-1">
      <p className="font-medium text-[var(--text-light)]">Order {order.orderId}</p>
      <p>
        Status: <span className="text-[var(--copper-light)]">{order.statusLabel}</span>
      </p>
      {order.placedAt && <p>Placed on {formatDate(order.placedAt)}</p>}
      {order.deliveredAt && <p>Delivered on {formatDate(order.deliveredAt)}</p>}
      {order.trackingNumber && <p>Tracking number: {order.trackingNumber}</p>}
      <ul className="list-disc pl-4 text-[var(--text-muted)]">
        {order.items.map((item, i) => (
          <li key={i}>
            {item.title}
            {[item.size, item.color].filter(Boolean).length ? ` (${[item.size, item.color].filter(Boolean).join(', ')})` : ''} ×{' '}
            {item.quantity}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactLink() {
  return (
    <Link href="/contact" className="underline text-[var(--copper-light)] hover:text-[var(--copper-main)]">
      Contact Us page
    </Link>
  );
}

export default function WheezChat({ className }: { className?: string }) {
  const { user } = useAuth();
  const { openModal } = useAuthModalStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<Step>({ kind: 'menu' });
  const [draft, setDraft] = useState<Draft>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Form fields for the few steps that need typing.
  const [orderIdInput, setOrderIdInput] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [detailsInput, setDetailsInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);

  const say = (from: Message['from'], content: ReactNode) => {
    if (from === 'bot') playWheezClick();
    setMessages((m) => [...m, { id: nextId.current++, from, content }]);
  };

  useEffect(() => {
    if (messages.length === 0) {
      say(
        'bot',
        <>
          Hi{user?.name ? ` ${user.name.split(' ')[0]}` : ''}, I&apos;m {WHEEZ_NAME}, the Wefton Copper helper. How can I
          help you today?
        </>,
      );
    }
    // Greet once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, step]);

  const backToMenu = (text = 'Anything else I can help with?') => {
    setDraft({});
    setError('');
    setSelectedItems([]);
    setPhotos([]);
    setDetailsInput('');
    say('bot', text);
    setStep({ kind: 'menu' });
  };

  // ── Orders ───────────────────────────────────────────────────

  const lookUp = async (intent: 'order_status' | 'return', orderId: string, contact: string) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/wheez/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ orderId, contact }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Something went wrong. Please try again.');
        return;
      }
      const orders: WheezOrderSummary[] = body.orders || [];
      setDraft((d) => ({ ...d, orderId, contact }));
      if (!orderId) {
        if (!orders.length) {
          say('bot', "I couldn't find any orders on your account. You can enter an order number instead.");
          setStep({ kind: 'order_lookup', intent });
          return;
        }
        say('bot', 'Which order?');
        setStep({ kind: 'pick_order', intent, orders });
        return;
      }
      showOrder(intent, orders[0]);
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const showOrder = (intent: 'order_status' | 'return', order: WheezOrderSummary) => {
    say('bot', <OrderCard order={order} />);
    setDraft((d) => ({ ...d, orderId: order.orderId }));
    if (intent === 'order_status') {
      setStep({ kind: 'after_status' });
      return;
    }
    if (order.returnWindow === 'open') {
      say('bot', 'Which items would you like to return or replace?');
      setSelectedItems(order.items.length === 1 ? [0] : []);
      setStep({ kind: 'return_items', order });
      return;
    }
    const reason = {
      not_delivered: 'Returns can be raised once your order is delivered.',
      expired: 'Returns can be raised within 7 days of delivery, and this order is past that window.',
      cancelled: 'This order was cancelled, so there is nothing to return.',
      open: '',
    }[order.returnWindow];
    backToMenu(`${reason} If you need help with it, please reach us on the Contact Us page. Anything else?`);
  };

  const startOrderFlow = (intent: 'order_status' | 'return') => {
    if (user) {
      lookUp(intent, '', '');
    } else {
      say('bot', 'Please enter your order number and the email or phone number you used for the order.');
      setStep({ kind: 'order_lookup', intent });
    }
  };

  // ── Menu ─────────────────────────────────────────────────────

  const pickIntent = (intent: WheezIntent) => {
    say('user', labelFor(WHEEZ_INTENTS, intent));
    setError('');
    switch (intent) {
      case 'order_status':
      case 'return':
        setDraft({ type: intent === 'return' ? 'return' : undefined });
        startOrderFlow(intent);
        break;
      case 'review':
        if (user) {
          backToMenu('You can rate and review the products you received in My Account → Orders. Anything else?');
          say(
            'bot',
            <Link href="/account?tab=orders" className="underline text-[var(--copper-light)]">
              Go to my orders
            </Link>,
          );
        } else {
          say('bot', 'Reviews come from customers who bought the product. Please sign in, then open My Account → Orders.');
          setStep({ kind: 'menu' });
          openModal();
        }
        break;
      case 'complaint':
      case 'suggestion':
      case 'report':
        setDraft({ type: intent });
        say('bot', TOPIC_QUESTION[intent]);
        setStep({ kind: 'topic', type: intent });
        break;
      case 'other':
        backToMenu('For anything else, our team is happy to help on the Contact Us page. Anything else I can do?');
        say('bot', <ContactLink />);
        break;
    }
  };

  // ── Requests ─────────────────────────────────────────────────

  const askDetailsOrSubmit = (d: Draft) => {
    say('bot', DETAILS_QUESTION[d.type!]);
    setStep({ kind: 'details' });
  };

  const afterDetails = (d: Draft) => {
    const known = user?.email || (d.contact?.includes('@') ? d.contact : '');
    if (!known && d.type !== 'report') {
      say('bot', 'What email can we reply to?');
      setStep({ kind: 'email' });
      return;
    }
    submit({ ...d, email: d.email || known || '' });
  };

  const submit = async (d: Draft) => {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append(
        'payload',
        JSON.stringify({
          type: d.type,
          topic: d.topic,
          outcome: d.outcome,
          orderId: d.orderId || '',
          contact: d.contact || '',
          items: d.items,
          details: d.details || '',
          email: d.email || '',
          name: user?.name || '',
          pageUrl: d.type === 'report' ? document.referrer || window.location.href : '',
        }),
      );
      photos.forEach((p) => form.append('images', p));
      const res = await fetch('/api/wheez/requests', { method: 'POST', headers: await authHeader(), body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Something went wrong. Please try again.');
        return;
      }
      say('bot', <p className="font-medium text-[var(--text-light)]">{body.message}</p>);
      setPhotos([]);
      setStep({ kind: 'done' });
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Rendering ────────────────────────────────────────────────

  const options = (list: readonly Option[], onPick: (o: Option) => void) => (
    <div className="flex flex-wrap gap-2">
      {list.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={busy}
          onClick={() => onPick(o)}
          className="rounded-full border border-[var(--border-copper)] px-3 py-1.5 text-xs text-[var(--copper-light)] hover:bg-[var(--copper-main)]/10 disabled:opacity-50 text-left"
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const menuLink = (
    <button type="button" onClick={() => backToMenu('Sure. What can I help with?')} className="text-xs text-[var(--text-faint)] underline">
      Main menu
    </button>
  );

  const input =
    'w-full rounded border border-[var(--border-subtle)] bg-transparent px-3 py-2 text-sm text-[var(--text-light)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--copper-main)]';
  const primary =
    'rounded bg-[var(--copper-main)] px-4 py-2 text-xs font-medium uppercase tracking-widest text-white hover:bg-[var(--copper-dark)] disabled:opacity-50';

  let controls: ReactNode = null;
  switch (step.kind) {
    case 'menu':
      controls = options(WHEEZ_INTENTS, (o) => pickIntent(o.value as WheezIntent));
      break;
    case 'order_lookup':
      controls = (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!orderIdInput.trim()) return setError('Please enter your order number');
            if (!user && !contactInput.trim()) return setError('Please enter the email or phone used for the order');
            say('user', `Order ${orderIdInput.trim().toUpperCase()}`);
            lookUp(step.intent, orderIdInput.trim(), contactInput.trim());
          }}
        >
          <input className={input} placeholder="Order number, e.g. WC-…" value={orderIdInput} onChange={(e) => setOrderIdInput(e.target.value)} aria-label="Order number" />
          {!user && (
            <input className={input} placeholder="Email or phone used for the order" value={contactInput} onChange={(e) => setContactInput(e.target.value)} aria-label="Email or phone used for the order" />
          )}
          <div className="flex items-center justify-between">
            <button type="submit" className={primary} disabled={busy}>
              Find my order
            </button>
            {menuLink}
          </div>
        </form>
      );
      break;
    case 'pick_order':
      controls = (
        <div className="space-y-2">
          {options(
            step.orders.map((o) => ({ value: o.orderId, label: `${o.orderId} · ${o.statusLabel}` })),
            (o) => {
              say('user', o.label);
              showOrder(step.intent, step.orders.find((x) => x.orderId === o.value)!);
            },
          )}
          <div className="flex items-center justify-between">
            <button type="button" className="text-xs text-[var(--copper-light)] underline" onClick={() => setStep({ kind: 'order_lookup', intent: step.intent })}>
              Enter another order number
            </button>
            {menuLink}
          </div>
        </div>
      );
      break;
    case 'after_status':
      controls = options(
        [
          { value: 'another', label: 'Check another order' },
          { value: 'menu', label: 'Main menu' },
        ],
        (o) => {
          say('user', o.label);
          if (o.value === 'another') startOrderFlow('order_status');
          else backToMenu();
        },
      );
      break;
    case 'return_items':
      controls = (
        <div className="space-y-2">
          {step.order.items.map((item, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-[var(--text-light)]">
              <input
                type="checkbox"
                checked={selectedItems.includes(i)}
                onChange={(e) => setSelectedItems((s) => (e.target.checked ? [...s, i] : s.filter((x) => x !== i)))}
                className="accent-[var(--copper-main)]"
              />
              {item.title} {[item.size, item.color].filter(Boolean).length ? `(${[item.size, item.color].filter(Boolean).join(', ')})` : ''}
            </label>
          ))}
          <div className="flex items-center justify-between">
            <button
              type="button"
              className={primary}
              disabled={!selectedItems.length}
              onClick={() => {
                say('user', selectedItems.map((i) => step.order.items[i].title).join(', '));
                setDraft((d) => ({ ...d, items: selectedItems }));
                say('bot', 'What went wrong?');
                setStep({ kind: 'return_reason' });
              }}
            >
              Continue
            </button>
            {menuLink}
          </div>
        </div>
      );
      break;
    case 'return_reason':
      controls = (
        <div className="space-y-2">
          {options(RETURN_REASONS, (o) => {
            say('user', o.label);
            setDraft((d) => ({ ...d, topic: o.value }));
            say('bot', 'Would you like a replacement or a refund?');
            setStep({ kind: 'return_outcome' });
          })}
          <p className="text-xs text-[var(--text-faint)]">
            Returns are accepted only for these reasons. Please check the size chart before ordering.
          </p>
        </div>
      );
      break;
    case 'return_outcome':
      controls = options(RETURN_OUTCOMES, (o) => {
        say('user', o.label);
        setDraft((d) => ({ ...d, outcome: o.value }));
        say('bot', `Please add up to ${MAX_IMAGES} photos of what you received, showing the damage or the size, colour or fit label.`);
        setStep({ kind: 'return_photos' });
      });
      break;
    case 'return_photos':
      controls = (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <span key={i} className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-xs text-[var(--text-muted)]">
                {p.name.slice(0, 18)}
                <button type="button" aria-label={`Remove ${p.name}`} onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          {photos.length < MAX_IMAGES && (
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded border border-dashed border-[var(--border-copper)] px-3 py-2 text-xs text-[var(--copper-light)]">
              <ImagePlus size={14} /> Add photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = '';
                  if (files.some((f) => !isAllowedImage(f.type, f.size))) {
                    setError('Photos must be JPG, PNG, WebP or HEIC, up to 5 MB each');
                  } else setError('');
                  setPhotos((ps) => [...ps, ...files.filter((f) => isAllowedImage(f.type, f.size))].slice(0, MAX_IMAGES));
                }}
              />
            </label>
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              className={primary}
              disabled={!photos.length}
              onClick={() => {
                say('user', `${photos.length} photo${photos.length > 1 ? 's' : ''} added`);
                askDetailsOrSubmit(draft);
              }}
            >
              Continue
            </button>
            {menuLink}
          </div>
        </div>
      );
      break;
    case 'topic':
      controls = (
        <div className="space-y-2">
          {options(TOPICS[step.type], (o) => {
            say('user', o.label);
            const d = { ...draft, topic: o.value };
            setDraft(d);
            askDetailsOrSubmit(d);
          })}
          {menuLink}
        </div>
      );
      break;
    case 'details': {
      const optional = draft.type === 'return';
      controls = (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const text = detailsInput.trim();
            if (!optional && text.length < 10) return setError('Please tell us a little more (at least 10 characters)');
            if (text) say('user', text);
            const d = { ...draft, details: text };
            setDraft(d);
            afterDetails(d);
          }}
        >
          <textarea
            className={cn(input, 'min-h-[80px] resize-none')}
            maxLength={MAX_DETAILS}
            value={detailsInput}
            onChange={(e) => setDetailsInput(e.target.value)}
            aria-label="Details"
          />
          <div className="flex items-center justify-between">
            <button type="submit" className={primary} disabled={busy}>
              {optional && !detailsInput.trim() ? 'Skip and send' : 'Send'}
            </button>
            {menuLink}
          </div>
        </form>
      );
      break;
    }
    case 'email':
      controls = (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^\S+@\S+\.\S+$/.test(emailInput.trim())) return setError('Please enter a valid email address');
            say('user', emailInput.trim());
            submit({ ...draft, email: emailInput.trim() });
          }}
        >
          <input className={input} type="email" placeholder="you@example.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} aria-label="Email" />
          <div className="flex items-center justify-between">
            <button type="submit" className={primary} disabled={busy}>
              Send
            </button>
            {menuLink}
          </div>
        </form>
      );
      break;
    case 'done':
      controls = options([{ value: 'menu', label: 'Main menu' }], () => backToMenu());
      break;
  }

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-3 p-4" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex', m.from === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                m.from === 'user'
                  ? 'bg-[var(--copper-main)]/15 text-[var(--text-light)] rounded-br-sm'
                  : 'bg-white/5 text-[var(--text-muted)] rounded-bl-sm',
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
            <Loader2 size={14} className="animate-spin" /> {WHEEZ_NAME} is checking…
          </div>
        )}
      </div>
      <div className="border-t border-[var(--border-subtle)] p-4 space-y-2">
        {error && (
          <p role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}
        {controls}
      </div>
    </div>
  );
}

