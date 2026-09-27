import type { Order } from '@/types';

export type EmailType = 'confirmation' | 'shipped' | 'delivered';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Validates an email address format.
 * Returns false for null, undefined, empty, or malformed email strings.
 */
export function isValidEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  if (trimmed.length === 0) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

/**
 * Builds the email payload for a given order and email type.
 * Pure function — no side effects, fully testable.
 */
export function buildEmailPayload(
  order: Order,
  type: EmailType,
  recipientEmail: string
): EmailPayload {
  const subject = {
    confirmation: `Order Confirmed — #${order.orderId}`,
    shipped: `Your Order Has Shipped — #${order.orderId}`,
    delivered: `Order Delivered — #${order.orderId}`,
  }[type];

  const html = generateEmailHtml(order, type);

  return { to: recipientEmail, subject, html };
}

/**
 * Generates branded HTML email content based on order details and email type.
 */
export function generateEmailHtml(order: Order, type: EmailType): string {
  const baseStyles = `
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #1a1a1a;
    line-height: 1.6;
  `;

  const headerHtml = `
    <div style="background-color: #b87333; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
        Wefton Copper
      </h1>
    </div>
  `;

  const footerHtml = `
    <div style="background-color: #f5f5f5; padding: 24px; text-align: center; font-size: 12px; color: #737373;">
      <p style="margin: 0;">© ${new Date().getFullYear()} Wefton Copper. All rights reserved.</p>
      <p style="margin: 8px 0 0 0;">
        <a href="https://weftoncopper.com/terms" style="color: #b87333; text-decoration: none;">Terms</a> |
        <a href="https://weftoncopper.com/privacy" style="color: #b87333; text-decoration: none;">Privacy</a> |
        <a href="https://weftoncopper.com/refund-policy" style="color: #b87333; text-decoration: none;">Refund Policy</a>
      </p>
    </div>
  `;

  let bodyHtml = '';

  switch (type) {
    case 'confirmation':
      bodyHtml = generateConfirmationBody(order);
      break;
    case 'shipped':
      bodyHtml = generateShippedBody(order);
      break;
    case 'delivered':
      bodyHtml = generateDeliveredBody(order);
      break;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8" /></head>
    <body style="${baseStyles} margin: 0; padding: 0; background-color: #f9f9f9;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        ${headerHtml}
        <div style="padding: 32px 24px;">
          ${bodyHtml}
        </div>
        ${footerHtml}
      </div>
    </body>
    </html>
  `;
}

function generateConfirmationBody(order: Order): string {
  const itemsHtml = order.products
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
          <strong>${item.title}</strong>
          ${item.size ? `<br/><span style="color: #737373; font-size: 13px;">Size: ${item.size}</span>` : ''}
          ${item.color ? `<br/><span style="color: #737373; font-size: 13px;">Color: ${item.color}</span>` : ''}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
      </tr>
    `
    )
    .join('');

  const address = order.shippingAddress;
  const addressHtml = `
    <p style="margin: 0; line-height: 1.8;">
      ${address.name}<br/>
      ${address.line1}${address.line2 ? `, ${address.line2}` : ''}<br/>
      ${address.city}, ${address.state} — ${address.pincode}<br/>
      ${address.country}<br/>
      Phone: ${address.phone}
    </p>
  `;

  // Estimated delivery: 5–7 business days from order date
  const orderDate = new Date(order.createdAt);
  const estStart = new Date(orderDate);
  estStart.setDate(estStart.getDate() + 5);
  const estEnd = new Date(orderDate);
  estEnd.setDate(estEnd.getDate() + 7);
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return `
    <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 8px 0;">Thank you for your order!</h2>
    <p style="color: #525252; margin: 0 0 24px 0;">
      Your order <strong>#${order.orderId}</strong> has been confirmed and is being prepared.
    </p>

    <h3 style="font-size: 16px; margin: 0 0 12px 0; color: #1a1a1a;">Order Items</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="border-bottom: 2px solid #1a1a1a;">
          <th style="text-align: left; padding: 8px 0;">Item</th>
          <th style="text-align: center; padding: 8px 0;">Qty</th>
          <th style="text-align: right; padding: 8px 0;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="margin-top: 16px; padding: 16px; background-color: #f9f9f9; border-radius: 8px;">
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 4px 0;">Subtotal</td>
          <td style="text-align: right;">₹${order.subtotal.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Shipping</td>
          <td style="text-align: right;">₹${order.shipping.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Taxes</td>
          <td style="text-align: right;">₹${order.taxes.toLocaleString('en-IN')}</td>
        </tr>
        <tr style="font-weight: 700; font-size: 16px;">
          <td style="padding: 8px 0; border-top: 1px solid #e5e5e5;">Total</td>
          <td style="padding: 8px 0; border-top: 1px solid #e5e5e5; text-align: right;">₹${order.total.toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>

    <h3 style="font-size: 16px; margin: 24px 0 12px 0; color: #1a1a1a;">Delivery Address</h3>
    ${addressHtml}

    <h3 style="font-size: 16px; margin: 24px 0 12px 0; color: #1a1a1a;">Estimated Delivery</h3>
    <p style="margin: 0; color: #525252;">
      ${formatDate(estStart)} – ${formatDate(estEnd)}
    </p>
  `;
}

function generateShippedBody(order: Order): string {
  const trackingHtml = order.trackingNumber
    ? `
      <h3 style="font-size: 16px; margin: 24px 0 12px 0; color: #1a1a1a;">Tracking Information</h3>
      <p style="margin: 0; color: #525252;">
        Tracking Number: <strong>${order.trackingNumber}</strong>
      </p>
    `
    : `
      <p style="margin: 24px 0 0 0; color: #737373; font-style: italic;">
        Tracking information will be updated shortly.
      </p>
    `;

  // Estimated delivery: 3–5 days from now
  const now = new Date();
  const estDelivery = new Date(now);
  estDelivery.setDate(estDelivery.getDate() + 3);
  const estDeliveryEnd = new Date(now);
  estDeliveryEnd.setDate(estDeliveryEnd.getDate() + 5);
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return `
    <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 8px 0;">Your order is on its way!</h2>
    <p style="color: #525252; margin: 0 0 24px 0;">
      Order <strong>#${order.orderId}</strong> has been shipped and is headed to you.
    </p>

    ${trackingHtml}

    <h3 style="font-size: 16px; margin: 24px 0 12px 0; color: #1a1a1a;">Estimated Delivery Date</h3>
    <p style="margin: 0; color: #525252;">
      ${formatDate(estDelivery)} – ${formatDate(estDeliveryEnd)}
    </p>

    <div style="margin-top: 32px; text-align: center;">
      <a href="https://weftoncopper.com/orders/${order.orderId}"
         style="display: inline-block; padding: 12px 32px; background-color: #b87333; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Track Your Order
      </a>
    </div>
  `;
}

function generateDeliveredBody(order: Order): string {
  return `
    <h2 style="color: #1a1a1a; font-size: 20px; margin: 0 0 8px 0;">Your order has been delivered!</h2>
    <p style="color: #525252; margin: 0 0 24px 0;">
      Order <strong>#${order.orderId}</strong> has been successfully delivered. We hope you love your purchase!
    </p>

    <div style="margin: 24px 0; padding: 24px; background-color: #f9f9f9; border-radius: 8px; text-align: center;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #1a1a1a;">
        How was your experience?
      </p>
      <a href="https://weftoncopper.com/orders/${order.orderId}/review"
         style="display: inline-block; padding: 12px 32px; background-color: #b87333; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Write a Review
      </a>
    </div>

    <p style="color: #737373; font-size: 13px; margin: 16px 0 0 0;">
      If you have any issues with your order, you can request a return within 7 days of delivery from your
      <a href="https://weftoncopper.com/orders" style="color: #b87333; text-decoration: none;">order history</a> page.
    </p>
  `;
}
