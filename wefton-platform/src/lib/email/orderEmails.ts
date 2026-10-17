// ============================================================
// Wefton Copper — Order email templates (pure, no I/O)
// ============================================================
import type { Order } from '@/types';
import { toDate } from '@/lib/utils';
import { itemsSummary } from '@/lib/orderSummary';

export { itemsSummary };

export interface EmailContent {
  subject: string;
  html: string;
}

const COPPER = '#8c4a22';
const SITE = 'https://weftoncopper.com';
const SUPPORT = 'sales@weftoncopper.com';
/** Refund window promised when an order is cancelled. */
export const REFUND_WINDOW = '5–10 business days';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const inr = (n: number | undefined) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

export function formatOrderDate(value: unknown): string {
  const d = toDate(value);
  return d
    ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    : '—';
}

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f7f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#1a1a1a;line-height:1.6;">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;">
    <div style="background:${COPPER};padding:22px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;letter-spacing:1px;">Wefton Copper</h1>
    </div>
    <div style="padding:28px 24px;">${body}</div>
    <div style="background:#f2efeb;padding:20px;text-align:center;font-size:12px;color:#6b6661;">
      <p style="margin:0;">Questions? Write to <a href="mailto:${SUPPORT}" style="color:${COPPER};">${SUPPORT}</a></p>
      <p style="margin:6px 0 0;">© ${new Date().getFullYear()} Wefton Copper ·
        <a href="${SITE}/refund-policy" style="color:${COPPER};text-decoration:none;">Refund Policy</a></p>
    </div>
  </div>
</body></html>`;
}

function itemsTable(order: Order): string {
  const rows = (order.products || [])
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;">
          <strong>${escapeHtml(i.title)}</strong>
          <div style="color:#6b6661;font-size:12px;">
            ${[i.productCode, i.sku, i.color, i.size ? `Size ${i.size}` : ''].filter(Boolean).map(escapeHtml).join(' · ')}
          </div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">${inr(i.price * i.quantity)}</td>
      </tr>`
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead><tr style="border-bottom:2px solid #1a1a1a;">
      <th style="text-align:left;padding:6px 0;">Item</th>
      <th style="text-align:center;padding:6px 0;">Qty</th>
      <th style="text-align:right;padding:6px 0;">Amount</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table style="width:100%;font-size:14px;margin-top:12px;">
    <tr><td>Subtotal</td><td style="text-align:right;">${inr(order.subtotal)}</td></tr>
    <tr><td>Shipping</td><td style="text-align:right;">${inr(order.shipping)}</td></tr>
    <tr><td>Taxes</td><td style="text-align:right;">${inr(order.taxes)}</td></tr>
    <tr style="font-weight:700;"><td style="padding-top:6px;border-top:1px solid #ddd;">Total</td>
      <td style="padding-top:6px;border-top:1px solid #ddd;text-align:right;">${inr(order.total)}</td></tr>
  </table>`;
}

function addressBlock(order: Order): string {
  const a = order.shippingAddress || ({} as Order['shippingAddress']);
  return `<p style="margin:0;font-size:14px;">
    ${escapeHtml(a.name)}<br/>
    ${escapeHtml(a.line1)}${a.line2 ? `, ${escapeHtml(a.line2)}` : ''}<br/>
    ${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.pincode)}<br/>
    Phone: ${escapeHtml(a.phone)}
  </p>`;
}

function customerName(order: Order): string {
  return order.customerName || order.shippingAddress?.name || 'there';
}

const PAYMENT_LABEL: Record<string, string> = {
  verified: 'Paid online (verified)',
  uploaded: 'UPI screenshot uploaded, needs checking',
};

// ── To the shop ───────────────────────────────────────────────

export function adminNewOrderEmail(order: Order): EmailContent {
  return {
    subject: `New order #${order.orderId} · ${inr(order.total)} · ${itemsSummary(order)}`,
    html: layout(`
      <h2 style="margin:0 0 6px;font-size:20px;">New order received</h2>
      <p style="margin:0 0 20px;color:#444;">Order <strong>#${escapeHtml(order.orderId)}</strong> placed on ${formatOrderDate(order.placedAt || order.createdAt)}.</p>
      <table style="width:100%;font-size:14px;margin-bottom:20px;">
        <tr><td style="color:#6b6661;width:130px;">Customer</td><td>${escapeHtml(customerName(order))}</td></tr>
        <tr><td style="color:#6b6661;">Email</td><td>${escapeHtml(order.customerEmail || '—')}</td></tr>
        <tr><td style="color:#6b6661;">Phone</td><td>${escapeHtml(order.customerPhone || order.shippingAddress?.phone || '—')}</td></tr>
        <tr><td style="color:#6b6661;">Payment</td><td>${escapeHtml(PAYMENT_LABEL[order.paymentStatus] || order.paymentStatus)}${order.paymentReference ? ` · Ref ${escapeHtml(order.paymentReference)}` : ''}</td></tr>
      </table>
      ${itemsTable(order)}
      <h3 style="font-size:15px;margin:22px 0 8px;">Ship to</h3>
      ${addressBlock(order)}
      <p style="margin:24px 0 0;font-size:13px;color:#6b6661;">Update the order to Closed in the admin panel once it is delivered.
        Open orders get a daily reminder from day 5 and are cancelled automatically after 10 days without a status update.</p>
      <p style="margin:16px 0 0;"><a href="${SITE}/admin" style="display:inline-block;padding:10px 24px;background:${COPPER};color:#fff;text-decoration:none;border-radius:6px;">Open admin panel</a></p>
    `),
  };
}

export interface OverdueOrder {
  order: Order;
  ageDays: number;
}

/** Daily high-priority digest of orders still open after 5 days. */
export function adminReminderEmail(overdue: OverdueOrder[], cancelledToday: Order[]): EmailContent {
  const row = ({ order, ageDays }: OverdueOrder) => `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;"><strong>#${escapeHtml(order.orderId)}</strong><br/>
        <span style="color:#6b6661;font-size:12px;">${formatOrderDate(order.placedAt || order.createdAt)}</span></td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;">${escapeHtml(customerName(order))}<br/>
        <span style="color:#6b6661;font-size:12px;">${escapeHtml(order.customerEmail || '')}</span></td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;">${escapeHtml(itemsSummary(order))}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;">${escapeHtml(order.orderStatus)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;color:${ageDays >= 8 ? '#b42318' : '#b54708'};font-weight:600;">${ageDays} days</td>
    </tr>`;
  const cancelled = cancelledToday.length
    ? `<h3 style="font-size:15px;margin:24px 0 8px;color:#b42318;">Cancelled automatically today (refund due)</h3>
       <ul style="font-size:14px;padding-left:18px;">${cancelledToday
         .map((o) => `<li>#${escapeHtml(o.orderId)} · ${escapeHtml(customerName(o))} · ${inr(o.total)}</li>`)
         .join('')}</ul>
       <p style="font-size:13px;color:#6b6661;">The customers were told the amount will be refunded within ${REFUND_WINDOW}. Please issue the refunds.</p>`
    : '';
  return {
    subject: `[Action needed] ${overdue.length} order(s) not closed after 5 days${cancelledToday.length ? `, ${cancelledToday.length} auto-cancelled` : ''}`,
    html: layout(`
      <h2 style="margin:0 0 6px;font-size:20px;color:#b42318;">Orders waiting to be closed</h2>
      <p style="margin:0 0 16px;color:#444;">These orders were placed more than 5 days ago and are still open. Orders with no status update for 10 days are cancelled automatically and the customer is told a refund is on its way.</p>
      ${overdue.length ? `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="text-align:left;color:#6b6661;"><th style="padding:6px;">Order</th><th style="padding:6px;">Customer</th><th style="padding:6px;">Items</th><th style="padding:6px;">Status</th><th style="padding:6px;text-align:right;">Open for</th></tr></thead>
        <tbody>${overdue.map(row).join('')}</tbody></table>` : ''}
      ${cancelled}
      <p style="margin:20px 0 0;"><a href="${SITE}/admin" style="display:inline-block;padding:10px 24px;background:${COPPER};color:#fff;text-decoration:none;border-radius:6px;">Open admin panel</a></p>
    `),
  };
}

// ── To the customer ───────────────────────────────────────────

export function customerConfirmationEmail(order: Order): EmailContent {
  return {
    subject: `Order confirmed · #${order.orderId}`,
    html: layout(`
      <h2 style="margin:0 0 6px;font-size:20px;">Thank you for your order, ${escapeHtml(customerName(order))}!</h2>
      <p style="margin:0 0 20px;color:#444;">We've received order <strong>#${escapeHtml(order.orderId)}</strong>${order.paymentStatus === 'uploaded' ? ' and will confirm your payment shortly' : ''}. Here's what you ordered:</p>
      ${itemsTable(order)}
      <h3 style="font-size:15px;margin:22px 0 8px;">Delivering to</h3>
      ${addressBlock(order)}
    `),
  };
}

export function customerDelayEmail(order: Order): EmailContent {
  return {
    subject: `Your order #${order.orderId} is taking longer than expected`,
    html: layout(`
      <h2 style="margin:0 0 6px;font-size:20px;">We're sorry for the delay</h2>
      <p style="color:#444;">Hi ${escapeHtml(customerName(order))},</p>
      <p style="color:#444;">Your order <strong>#${escapeHtml(order.orderId)}</strong>, placed on ${formatOrderDate(order.placedAt || order.createdAt)}, is taking longer than we expected. We apologise for the wait. Our team is on it and will update you as soon as it's on its way.</p>
      ${itemsTable(order)}
      <p style="color:#444;margin-top:20px;">If you have any questions, just reply to this email.</p>
    `),
  };
}

export function customerCancelledEmail(order: Order): EmailContent {
  const paid = order.paymentStatus === 'verified' || order.paymentStatus === 'uploaded' || order.paymentStatus === 'refund_due';
  return {
    subject: `Your order #${order.orderId} has been cancelled`,
    html: layout(`
      <h2 style="margin:0 0 6px;font-size:20px;">Your order has been cancelled</h2>
      <p style="color:#444;">Hi ${escapeHtml(customerName(order))},</p>
      <p style="color:#444;">We're very sorry. Due to technical issues we were unable to fulfil your order <strong>#${escapeHtml(order.orderId)}</strong>, placed on ${formatOrderDate(order.placedAt || order.createdAt)}, and it has been cancelled.</p>
      ${paid ? `<p style="color:#444;"><strong>Your payment of ${inr(order.total)} will be refunded to your original payment method within ${REFUND_WINDOW}.</strong></p>` : ''}
      ${itemsTable(order)}
      <p style="color:#444;margin-top:20px;">We apologise for the inconvenience. If you have any questions, just reply to this email.</p>
    `),
  };
}
