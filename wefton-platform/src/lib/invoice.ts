// ============================================================
// Wefton Copper — GST invoice data
// Turns a paid order into the figures printed on its tax invoice
// (lib/invoicePdf draws them). Pure: no Firestore, so it is unit tested.
//
// • Invoice date = the paid date (placedAt), in India time.
// • Invoice number = WC1102/YYMM/NNNN, YYMM from the invoice date.
// • Prices on the site include GST, so each line is worked back to its
//   taxable value; a coupon discount is spread over the lines first.
// • Customer in the seller's state → CGST + SGST, else IGST.
// All money is handled in paise so the lines add up to the order total.
// ============================================================
import { DEFAULT_HSN, INVOICE_PREFIX, INVOICE_SELLER, TAX_RATE } from '@/config/brand';
import { toDate } from '@/lib/utils';
import type { Order } from '@/types';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** GST state codes, keyed by lower-case state / UT name. */
const STATE_CODES: Record<string, string> = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  punjab: '03',
  chandigarh: '04',
  uttarakhand: '05',
  haryana: '06',
  delhi: '07',
  rajasthan: '08',
  'uttar pradesh': '09',
  bihar: '10',
  sikkim: '11',
  'arunachal pradesh': '12',
  nagaland: '13',
  manipur: '14',
  mizoram: '15',
  tripura: '16',
  meghalaya: '17',
  assam: '18',
  'west bengal': '19',
  jharkhand: '20',
  odisha: '21',
  chhattisgarh: '22',
  'madhya pradesh': '23',
  gujarat: '24',
  'dadra and nagar haveli and daman and diu': '26',
  maharashtra: '27',
  karnataka: '29',
  goa: '30',
  lakshadweep: '31',
  kerala: '32',
  'tamil nadu': '33',
  puducherry: '34',
  'andaman and nicobar islands': '35',
  telangana: '36',
  'andhra pradesh': '37',
  ladakh: '38',
};

const STATE_ALIASES: Record<string, string> = {
  'new delhi': 'delhi',
  'nct of delhi': 'delhi',
  orissa: 'odisha',
  pondicherry: 'puducherry',
  'j&k': 'jammu and kashmir',
  'jammu & kashmir': 'jammu and kashmir',
  'andaman & nicobar islands': 'andaman and nicobar islands',
  'dadra & nagar haveli and daman & diu': 'dadra and nagar haveli and daman and diu',
  'daman and diu': 'dadra and nagar haveli and daman and diu',
  'dadra and nagar haveli': 'dadra and nagar haveli and daman and diu',
  tn: 'tamil nadu',
};

/** GST state code for a state name ("Tamil Nadu" → "33"), or '' when unknown. */
export function gstStateCode(state: string | undefined): string {
  const key = (state || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return STATE_CODES[STATE_ALIASES[key] || key] || '';
}

/** The shop's calendar day in India time, as a Date whose UTC fields hold the IST values. */
function istParts(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

/** "2608" for any moment in August 2026 (India time). */
export function invoiceMonthKey(date: Date): string {
  const d = istParts(date);
  return `${String(d.getUTCFullYear()).slice(-2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** WC1102/2608/0001 */
export function formatInvoiceNumber(date: Date, seq: number): string {
  return `${INVOICE_PREFIX}/${invoiceMonthKey(date)}/${String(seq).padStart(4, '0')}`;
}

/** "Aug 20, 2026" in India time. */
export function formatInvoiceDate(date: Date): string {
  const d = istParts(date);
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  return `${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** The invoice date: when the order was paid (placedAt), else when it was created. */
export function invoiceDateFor(order: Pick<Order, 'placedAt' | 'createdAt'>): Date {
  return toDate(order.placedAt) || toDate(order.createdAt) || new Date();
}

/** Whether an invoice may be generated: payment verified and the order not cancelled. */
export function canInvoice(order: Pick<Order, 'paymentStatus' | 'orderStatus' | 'invoiceNumber'>): boolean {
  if (order.invoiceNumber) return true; // already issued: always downloadable again
  return order.paymentStatus === 'verified' && order.orderStatus !== 'cancelled';
}

const PAYMENT_LABELS: Record<Order['paymentMethod'], string> = {
  qr: 'UPI',
  razorpay: 'Online (Razorpay)',
  stripe: 'Card',
  cod: 'Cash on delivery',
  mock: 'Test payment',
};

export interface InvoiceLine {
  description: string;
  details: string[];
  hsn: string;
  quantity: number;
  /** All amounts in rupees, to 2 decimals. */
  rate: number; // taxable value per unit
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  orderId: string;
  seller: typeof INVOICE_SELLER;
  buyer: { name: string; addressLines: string[]; phone: string; email: string };
  placeOfSupply: string; // "Tamil Nadu (33)"
  interState: boolean;
  gstRatePercent: number;
  lines: InvoiceLine[];
  totals: { taxable: number; cgst: number; sgst: number; igst: number; total: number };
  discount: { code: string; amount: number } | null;
  amountInWords: string;
  payment: { method: string; reference: string; paidOn: string };
}

const toPaise = (rupees: number) => Math.round((Number(rupees) || 0) * 100);
const toRupees = (paise: number) => paise / 100;

/** Splits `total` paise over `weights` in proportion; the remainder goes to the last share. */
function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  let given = 0;
  return weights.map((w, i) => {
    if (i === weights.length - 1) return total - given;
    const share = Math.round((total * w) / sum);
    given += share;
    return share;
  });
}

/**
 * Builds the invoice for a paid order.
 * @param invoiceNumber the number already given to this order
 * @param productHsn current HSN by productId, for lines placed before HSN was stored
 */
export function buildInvoice(order: Order, invoiceNumber: string, productHsn: Record<string, string> = {}): InvoiceData {
  const date = invoiceDateFor(order);
  const address = order.shippingAddress || ({} as Order['shippingAddress']);
  const stateCode = gstStateCode(address.state);
  const interState = stateCode !== '' && stateCode !== INVOICE_SELLER.stateCode;
  // Prices include GST unless the order added tax on top.
  const inclusive = !(Number(order.taxes) > 0);
  const rate = TAX_RATE;

  const items = order.products || [];
  const raw = items.map((item) => ({
    description: item.title,
    details: [
      [item.size && `Size: ${item.size}`, item.color && `Colour: ${item.color}`].filter(Boolean).join(' · '),
      item.sku ? `SKU: ${item.sku}` : '',
    ].filter(Boolean),
    hsn: item.hsnCode || productHsn[item.productId] || DEFAULT_HSN,
    quantity: Number(item.quantity) || 0,
    gross: toPaise(item.price) * (Number(item.quantity) || 0),
  }));
  const shipping = toPaise(order.shipping);
  if (shipping > 0) {
    // Delivery is part of the same (composite) supply, so it takes the garments' rate.
    raw.push({ description: 'Delivery charges', details: [], hsn: raw[0]?.hsn || DEFAULT_HSN, quantity: 1, gross: shipping });
  }

  const discount = Math.min(toPaise(order.discountAmount || 0), raw.reduce((s, l) => s + l.gross, 0));
  const discounts = allocate(discount, raw.map((l) => l.gross));

  const lines: InvoiceLine[] = raw.map((l, i) => {
    const net = l.gross - discounts[i];
    const taxable = inclusive ? Math.round(net / (1 + rate)) : net;
    const tax = inclusive ? net - taxable : Math.round(net * rate);
    const cgst = interState ? 0 : Math.round(tax / 2);
    const sgst = interState ? 0 : tax - cgst;
    const igst = interState ? tax : 0;
    return {
      description: l.description,
      details: l.details,
      hsn: l.hsn,
      quantity: l.quantity,
      rate: toRupees(l.quantity ? Math.round(taxable / l.quantity) : taxable),
      taxable: toRupees(taxable),
      cgst: toRupees(cgst),
      sgst: toRupees(sgst),
      igst: toRupees(igst),
      total: toRupees(taxable + tax),
    };
  });

  const sum = (key: 'taxable' | 'cgst' | 'sgst' | 'igst' | 'total') =>
    toRupees(lines.reduce((s, l) => s + toPaise(l[key]), 0));
  const totals = { taxable: sum('taxable'), cgst: sum('cgst'), sgst: sum('sgst'), igst: sum('igst'), total: sum('total') };

  const cityLine = [address.city, address.state].filter(Boolean).join(', ');
  const addressLines = [
    address.line1,
    address.line2,
    [cityLine, `${address.country || 'India'}${address.pincode ? ` - ${address.pincode}` : ''}`].filter(Boolean).join(', '),
  ].filter((s): s is string => !!s && !!s.trim());

  return {
    invoiceNumber,
    invoiceDate: formatInvoiceDate(date),
    orderId: order.orderId,
    seller: INVOICE_SELLER,
    buyer: {
      name: order.customerName || address.name || 'Customer',
      addressLines,
      phone: order.customerPhone || address.phone || '',
      email: order.customerEmail || address.email || '',
    },
    placeOfSupply: stateCode ? `${address.state} (${stateCode})` : address.state || INVOICE_SELLER.state,
    interState,
    gstRatePercent: Math.round(rate * 100),
    lines,
    totals,
    discount: discount > 0 ? { code: order.couponCode || '', amount: toRupees(discount) } : null,
    amountInWords: amountInWords(totals.total),
    payment: {
      method: PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod || '',
      reference: order.razorpayPaymentId || order.paymentReference || '',
      paidOn: formatInvoiceDate(date),
    },
  };
}

// ── Amount in words (Indian numbering) ──
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ');
}

function wholeInWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  if (crore) parts.push(`${wholeInWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  return parts.join(' ');
}

/** 11025.5 → "Indian Rupees Eleven Thousand Twenty Five and Fifty Paise Only" */
export function amountInWords(amount: number): string {
  const paise = toPaise(amount);
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  return `Indian Rupees ${wholeInWords(rupees)}${rest ? ` and ${twoDigits(rest)} Paise` : ''} Only`;
}

/** "11,025.00" */
export function formatInvoiceAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

/** File name for the downloaded PDF: invoice-WC1102-2608-0001.pdf */
export function invoiceFileName(invoiceNumber: string): string {
  return `invoice-${invoiceNumber.replace(/[^A-Za-z0-9]+/g, '-')}.pdf`;
}
