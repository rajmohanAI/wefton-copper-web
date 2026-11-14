// ============================================================
// Wefton Copper — GST invoices (server only)
// Gives an order its invoice number the first time its invoice is
// generated, and builds the PDF. Numbers run WC1102/YYMM/0001, 0002 …
// per month of the paid date, from a counter in Firestore
// (counters/invoice-YYMM), so no number is ever skipped or used twice.
// ============================================================
import type { Firestore } from 'firebase-admin/firestore';
import { buildInvoice, canInvoice, formatInvoiceNumber, invoiceDateFor, invoiceFileName, invoiceMonthKey } from '@/lib/invoice';
import { renderInvoicePdf } from '@/lib/invoicePdf';
import type { Order, Product } from '@/types';

export class InvoiceError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Returns the order with its invoice number, giving it the next one if it has none yet. */
export async function issueInvoiceNumber(db: Firestore, docId: string, now = new Date()): Promise<Order> {
  const ref = db.collection('orders').doc(docId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new InvoiceError('Order not found.', 404);
    const order = snap.data() as Order;
    if (order.invoiceNumber) return order;
    if (!canInvoice(order)) {
      throw new InvoiceError('An invoice can be generated once the payment is verified (and the order is not cancelled).', 409);
    }
    const date = invoiceDateFor(order);
    const counterRef = db.collection('counters').doc(`invoice-${invoiceMonthKey(date)}`);
    const counter = await tx.get(counterRef);
    const seq = (Number(counter.get('last')) || 0) + 1;
    const invoiceNumber = formatInvoiceNumber(date, seq);
    const issuedAt = now.toISOString();
    tx.set(counterRef, { last: seq, updatedAt: issuedAt }, { merge: true });
    tx.update(ref, { invoiceNumber, invoiceIssuedAt: issuedAt });
    return { ...order, invoiceNumber, invoiceIssuedAt: issuedAt };
  });
}

/** Current HSN codes for the order's products, for lines saved before HSN was copied onto orders. */
async function productHsn(db: Firestore, order: Order): Promise<Record<string, string>> {
  const ids = [...new Set((order.products || []).filter((p) => !p.hsnCode && p.productId).map((p) => p.productId))];
  const out: Record<string, string> = {};
  await Promise.all(
    ids.map(async (id) => {
      const snap = await db.collection('products').doc(id).get();
      const hsn = snap.exists ? (snap.data() as Product).hsnCode : '';
      if (hsn) out[id] = hsn;
    })
  );
  return out;
}

/** The invoice PDF for an order, issuing its number on first use. */
export async function generateInvoicePdf(db: Firestore, docId: string): Promise<{ bytes: Uint8Array; fileName: string; invoiceNumber: string }> {
  const order = await issueInvoiceNumber(db, docId);
  const invoiceNumber = order.invoiceNumber as string;
  const data = buildInvoice(order, invoiceNumber, await productHsn(db, order));
  return { bytes: await renderInvoicePdf(data), fileName: invoiceFileName(invoiceNumber), invoiceNumber };
}
