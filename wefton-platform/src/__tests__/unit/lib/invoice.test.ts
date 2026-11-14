// ============================================================
// Wefton Copper — GST invoice
// ============================================================
import { writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  amountInWords,
  buildInvoice,
  canInvoice,
  formatInvoiceNumber,
  gstStateCode,
  invoiceFileName,
} from '@/lib/invoice';
import { renderInvoicePdf } from '@/lib/invoicePdf';
import type { Order } from '@/types';

function order(overrides: Partial<Order> = {}): Order {
  return {
    orderId: 'WC-MH1ABC-X9YZ',
    userId: 'u1',
    products: [
      { productId: 'p1', title: 'Premium Tee', image: '', price: 999, quantity: 2, size: 'M', color: 'Olive Green', sku: 'WCPM001-03-M', hsnCode: '6109' },
      { productId: 'p2', title: 'Premium Polo', image: '', price: 1299, quantity: 1, size: 'L', color: 'Black', sku: 'WCPM002-01-L' },
    ],
    subtotal: 3297,
    shipping: 0,
    taxes: 0,
    total: 3297,
    paymentStatus: 'verified',
    orderStatus: 'confirmed',
    paymentMethod: 'razorpay',
    razorpayPaymentId: 'pay_RZP123456789',
    shippingAddress: {
      addressId: 'a1',
      name: 'Priya Raman',
      phone: '9876543210',
      line1: '12, Lake View Street',
      line2: 'Anna Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600040',
      country: 'India',
    },
    customerEmail: 'priya@example.com',
    createdAt: '2026-08-20T05:00:00.000Z',
    placedAt: '2026-08-20T19:00:00.000Z', // Aug 21 00:30 in India
    ...overrides,
  };
}

describe('GST invoice', () => {
  it('numbers invoices WC1102/YYMM/NNNN by the India-time month', () => {
    expect(formatInvoiceNumber(new Date('2026-08-20T10:00:00Z'), 1)).toBe('WC1102/2608/0001');
    // 31 Aug 20:00 UTC is already 1 Sep in India.
    expect(formatInvoiceNumber(new Date('2026-08-31T20:00:00Z'), 42)).toBe('WC1102/2609/0042');
    expect(formatInvoiceNumber(new Date('2026-08-20T10:00:00Z'), 1)).toHaveLength(16); // GST max
    expect(invoiceFileName('WC1102/2608/0001')).toBe('invoice-WC1102-2608-0001.pdf');
  });

  it('dates the invoice on the paid date and adds up to the order total', () => {
    const inv = buildInvoice(order(), 'WC1102/2608/0001', { p2: '6105' });
    expect(inv.invoiceDate).toBe('Aug 21, 2026');
    expect(inv.interState).toBe(false);
    expect(inv.placeOfSupply).toBe('Tamil Nadu (33)');
    expect(inv.lines.map((l) => l.hsn)).toEqual(['6109', '6105']);
    // ₹1,998 incl. 5% → 1902.86 taxable + 95.14 tax, split 47.57 / 47.57.
    expect(inv.lines[0]).toMatchObject({ quantity: 2, taxable: 1902.86, cgst: 47.57, sgst: 47.57, igst: 0, total: 1998, rate: 951.43 });
    expect(inv.totals.total).toBe(3297);
    expect(inv.totals.taxable + inv.totals.cgst + inv.totals.sgst).toBeCloseTo(3297, 2);
    expect(inv.payment).toEqual({ method: 'Online (Razorpay)', reference: 'pay_RZP123456789', paidOn: 'Aug 21, 2026' });
  });

  it('uses IGST outside Tamil Nadu and spreads a coupon over the lines', () => {
    const inv = buildInvoice(
      order({
        shippingAddress: { ...order().shippingAddress, city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
        discountAmount: 329.7,
        couponCode: 'WELCOME10',
        total: 2967.3,
      }),
      'WC1102/2608/0002'
    );
    expect(inv.interState).toBe(true);
    expect(inv.placeOfSupply).toBe('Karnataka (29)');
    expect(inv.lines.every((l) => l.cgst === 0 && l.sgst === 0 && l.igst > 0)).toBe(true);
    expect(inv.totals.total).toBe(2967.3);
    expect(inv.discount).toEqual({ code: 'WELCOME10', amount: 329.7 });
    expect(inv.lines[1].hsn).toBe('6109'); // default HSN
  });

  it('only invoices verified, uncancelled orders (or ones already invoiced)', () => {
    expect(canInvoice({ paymentStatus: 'verified', orderStatus: 'confirmed' })).toBe(true);
    expect(canInvoice({ paymentStatus: 'uploaded', orderStatus: 'placed' })).toBe(false);
    expect(canInvoice({ paymentStatus: 'pending', orderStatus: 'placed' })).toBe(false);
    expect(canInvoice({ paymentStatus: 'verified', orderStatus: 'cancelled' })).toBe(false);
    expect(canInvoice({ paymentStatus: 'refunded', orderStatus: 'cancelled', invoiceNumber: 'WC1102/2608/0001' })).toBe(true);
  });

  it('knows state codes and writes amounts in words', () => {
    expect(gstStateCode('tamil nadu')).toBe('33');
    expect(gstStateCode('New Delhi')).toBe('07');
    expect(gstStateCode('Atlantis')).toBe('');
    expect(amountInWords(11025)).toBe('Indian Rupees Eleven Thousand Twenty Five Only');
    expect(amountInWords(1234567.5)).toBe('Indian Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and Fifty Paise Only');
  });

  it('renders a one-page A4 PDF', async () => {
    const bytes = await renderInvoicePdf(buildInvoice(order(), 'WC1102/2608/0001'));
    if (process.env.INVOICE_PDF_OUT) writeFileSync(process.env.INVOICE_PDF_OUT, bytes);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toBe('Invoice WC1102/2608/0001');
  });

  it('draws text the PDF fonts cannot encode (tabs, newlines, ₹, emoji, Tamil) without failing', async () => {
    const o = order({
      customerName: 'Karthi\tkeyan 😀',
      couponCode: 'SAVE\u200b10',
      discountAmount: 100,
      total: 3197,
      shippingAddress: { ...order().shippingAddress, line1: 'No. 5,\nGandhi Street\r\n', line2: 'அண்ணா நகர் Anna Nagar' },
      products: [{ ...order().products[0], title: 'Premium Tee – ₹999 deal ✨' }],
    });
    const bytes = await renderInvoicePdf(buildInvoice(o, 'WC1102/2611/0001'));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it('carries a long order onto more pages', async () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ ...order().products[0], title: `Premium Tee ${i + 1}` }));
    const bytes = await renderInvoicePdf(
      buildInvoice(order({ products: many, total: 999 * 2 * 14, shippingAddress: { ...order().shippingAddress, state: 'Kerala' } }), 'WC1102/2608/0003')
    );
    if (process.env.INVOICE_PDF_OUT_LONG) writeFileSync(process.env.INVOICE_PDF_OUT_LONG, bytes);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  });
});
