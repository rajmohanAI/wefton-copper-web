// ============================================================
// Wefton Copper — GST tax invoice PDF (server only)
// Draws lib/invoice's InvoiceData on A4 in the shop's invoice style:
// logo + name header with the copper rule, Billed By / Billed To boxes,
// the item table with an HSN column, payment details instead of "scan to
// pay" (website orders are already paid), totals, a red PAID seal and a
// footer with the website QR and the computer-generated (no signature) note.
// The standard PDF fonts have no ₹ glyph, so the rupee sign is drawn as
// a small vector shape (drawRupee).
// ============================================================
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from 'pdf-lib';
import { formatInvoiceAmount, type InvoiceData, type InvoiceLine } from '@/lib/invoice';
import { INVOICE_LOGO_JPG_BASE64 } from '@/lib/invoiceLogo';

const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const M = 36; // side margin
const CONTENT_W = PAGE_W - 2 * M;
const FOOTER_H = 92; // reserved at the bottom of every page

const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.38, 0.38, 0.42);
const TEAL = rgb(0.2, 0.45, 0.53); // brand name, as on the shop's invoice
const COPPER = rgb(0.71, 0.42, 0.22);
const BOX_FILL = rgb(0.84, 0.81, 0.95); // lavender boxes
const BOX_LINE = rgb(0.2, 0.2, 0.4);
const TABLE_FILL = rgb(0.95, 0.95, 0.95);
const SEAL_RED = rgb(0.78, 0.13, 0.15);

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

interface Ctx {
  pdf: PDFDocument;
  page: PDFPage;
  fonts: Fonts;
  data: InvoiceData;
  logo: PDFImage;
  qr: PDFImage | null;
  pages: PDFPage[];
}

// Coordinates below are measured from the top of the page.
const Y = (top: number) => PAGE_H - top;

// The standard fonts only cover WinAnsi (Latin-1 plus a few symbols); a tab,
// newline, emoji, ₹ or non-Latin letter makes pdf-lib throw. Customer- and
// admin-typed text goes through pdfSafe so one odd character can't break the invoice.
const encodable = new Map<string, boolean>();
function canEncode(font: PDFFont, ch: string): boolean {
  const key = `${font.name}|${ch}`;
  let ok = encodable.get(key);
  if (ok === undefined) {
    try {
      font.encodeText(ch);
      ok = true;
    } catch {
      ok = false;
    }
    encodable.set(key, ok);
  }
  return ok;
}

/** `s` with only characters the font can draw: whitespace → space, ₹ → Rs., the rest dropped. */
export function pdfSafe(font: PDFFont, s: string): string {
  const out = [...String(s ?? '').normalize('NFC')]
    .map((ch) => (/\s/.test(ch) ? ' ' : ch === '\u20b9' ? 'Rs.' : canEncode(font, ch) ? ch : ''))
    .join('');
  return out.replace(/ {2,}/g, ' ').trim();
}

function text(page: PDFPage, raw: string, x: number, top: number, font: PDFFont, size: number, color: RGB = INK) {
  const s = pdfSafe(font, raw);
  page.drawText(s, { x, y: Y(top) - size * 0.8, font, size, color });
}

function textRight(page: PDFPage, raw: string, right: number, top: number, font: PDFFont, size: number, color: RGB = INK) {
  const s = pdfSafe(font, raw);
  text(page, s, right - font.widthOfTextAtSize(s, size), top, font, size, color);
}

/** Wraps `s` to lines no wider than `width`. */
function wrap(s: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const rawPara of String(s ?? '').split('\n')) {
    const para = pdfSafe(font, rawPara);
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [''];
}

/** A rupee sign whose top-left is at (x, top), sized to sit beside text of `size`. */
function drawRupee(page: PDFPage, x: number, top: number, size: number, color: RGB = INK, weight = 1) {
  const h = size * 0.72;
  const w = h * 0.62;
  const t = top + size * 0.8 - h; // cap top for text drawn at `top`
  const s = h; // path is drawn in a 1-unit-high box
  const path = 'M 0 0 H 0.62 M 0 0.24 H 0.62 M 0.08 0 C 0.6 0 0.6 0.47 0.08 0.47 H 0 L 0.5 1';
  page.drawSvgPath(path, {
    x,
    y: Y(t),
    scale: s,
    borderColor: color,
    borderWidth: (size * 0.085 * weight) / s,
    borderLineCap: 0,
  });
  return w;
}

/** "₹11,025.00" right-aligned at `right`. */
function money(page: PDFPage, amount: number, right: number, top: number, font: PDFFont, size: number, color: RGB = INK) {
  const num = formatInvoiceAmount(amount);
  const numW = font.widthOfTextAtSize(num, size);
  const gap = size * 0.12;
  const rupeeW = size * 0.72 * 0.62;
  textRight(page, num, right, top, font, size, color);
  drawRupee(page, right - numW - gap - rupeeW, top, size, color);
}

function roundedRect(page: PDFPage, x: number, top: number, w: number, h: number, r: number, fill: RGB, line: RGB) {
  const p = `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
  page.drawSvgPath(p, { x, y: Y(top), color: fill, borderColor: line, borderWidth: 1 });
}

// ── Header: small logo, letter-spaced brand name, one hairline ──
/** Draws `s` with extra space between letters; returns its width. */
function spaced(page: PDFPage, s: string, x: number, top: number, font: PDFFont, size: number, tracking: number, color: RGB = INK): number {
  let cx = x;
  for (const ch of s) {
    text(page, ch, cx, top, font, size, color);
    cx += font.widthOfTextAtSize(ch, size) + tracking;
  }
  return cx - tracking - x;
}

function spacedWidth(s: string, font: PDFFont, size: number, tracking: number): number {
  return [...s].reduce((w, ch) => w + font.widthOfTextAtSize(ch, size) + tracking, -tracking);
}

function drawHeader(ctx: Ctx): number {
  const { page, fonts, logo } = ctx;
  const logoH = 30;
  const logoW = (logo.width / logo.height) * logoH;
  page.drawImage(logo, { x: M, y: Y(26 + logoH), width: logoW, height: logoH });
  spaced(page, 'WEFTON COPPER', M + logoW + 10, 33, fonts.regular, 15, 3.2, INK);
  text(page, 'www.weftoncopper.com', M + logoW + 10, 52, fonts.regular, 7.5, MUTED);
  const label = 'TAX INVOICE';
  spaced(page, label, PAGE_W - M - spacedWidth(label, fonts.regular, 10, 2.4), 33, fonts.regular, 10, 2.4, COPPER);
  // Rule 48: the customer's copy of an invoice for goods is marked ORIGINAL FOR RECIPIENT.
  textRight(page, 'ORIGINAL FOR RECIPIENT', PAGE_W - M, 50, fonts.regular, 7, MUTED);
  page.drawLine({ start: { x: M, y: Y(68) }, end: { x: PAGE_W - M, y: Y(68) }, thickness: 0.75, color: COPPER });
  return 84;
}

// ── PAID seal ──
function drawSeal(page: PDFPage, fonts: Fonts, cx: number, cyTop: number, paidOn: string) {
  const cy = Y(cyTop);
  const R = 42;
  const opacity = 0.85;
  page.drawCircle({ x: cx, y: cy, size: R, borderColor: SEAL_RED, borderWidth: 2.2, borderOpacity: opacity });
  page.drawCircle({ x: cx, y: cy, size: R - 15, borderColor: SEAL_RED, borderWidth: 1, borderOpacity: opacity });
  // Curved text along the band between the two rings.
  const arc = (s: string, size: number, top: boolean) => {
    const r = R - 7.5; // middle of the band
    const font = fonts.bold;
    const widths = [...s].map((ch) => font.widthOfTextAtSize(ch, size));
    const total = widths.reduce((a, b) => a + b, 0) + (s.length - 1) * 0.8;
    let angle = (top ? 1 : -1) * (total / r / 2); // radians from vertical
    for (let i = 0; i < s.length; i++) {
      const half = widths[i] / 2 / r;
      angle -= (top ? 1 : -1) * half;
      // Position of the glyph's baseline centre on the circle.
      const a = top ? Math.PI / 2 + angle : -Math.PI / 2 + angle;
      const rr = top ? r - size * 0.36 : r + size * 0.36;
      const gx = cx + rr * Math.cos(a);
      const gy = cy + rr * Math.sin(a);
      const rot = top ? a - Math.PI / 2 : a + Math.PI / 2;
      const ox = -(widths[i] / 2) * Math.cos(rot);
      const oy = -(widths[i] / 2) * Math.sin(rot);
      page.drawText(s[i], {
        x: gx + ox,
        y: gy + oy,
        font,
        size,
        color: SEAL_RED,
        opacity,
        rotate: degrees((rot * 180) / Math.PI),
      });
      angle -= (top ? 1 : -1) * (half + 0.8 / r);
    }
  };
  arc('WEFTON COPPER', 7.5, true);
  arc('PROPRIETORSHIP', 6.5, false);
  const paid = 'PAID';
  const pw = fonts.bold.widthOfTextAtSize(paid, 15);
  page.drawText(paid, { x: cx - pw / 2, y: cy - 1, font: fonts.bold, size: 15, color: SEAL_RED, opacity });
  const dw = fonts.regular.widthOfTextAtSize(paidOn, 6.5);
  page.drawText(paidOn, { x: cx - dw / 2, y: cy - 10, font: fonts.regular, size: 6.5, color: SEAL_RED, opacity });
}

// ── Invoice meta + parties ──
function drawParties(ctx: Ctx, top: number): number {
  const { page, fonts, data } = ctx;
  let y = top + 6;
  const meta: [string, string][] = [
    ['Invoice No', data.invoiceNumber],
    ['Invoice Date', data.invoiceDate],
    ['Order ID', data.orderId],
    ['Reverse Charge', 'No'],
  ];
  for (const [k, v] of meta) {
    const label = `${k}: `;
    text(page, label, M + 8, y, fonts.bold, 10);
    text(page, v, M + 8 + fonts.bold.widthOfTextAtSize(label, 10), y, fonts.regular, 10);
    y += 15;
  }
  drawSeal(page, fonts, PAGE_W - M - 60, top + 40, data.payment.paidOn);

  // Billed By / Billed To
  const boxTop = Math.max(y + 10, top + 92); // clear of the seal
  const gap = 24;
  const boxW = (CONTENT_W - gap) / 2;
  const pad = 12;
  const lineW = boxW - 2 * pad;
  const by = [
    ...data.seller.addressLines.flatMap((l) => wrap(l, fonts.regular, 8.5, lineW)),
    `State: ${data.seller.state}, Code: ${data.seller.stateCode}`,
  ];
  const to = [
    ...data.buyer.addressLines.flatMap((l) => wrap(l, fonts.regular, 8.5, lineW)),
    ...(data.buyer.phone ? [`Phone: ${data.buyer.phone}`] : []),
    ...(data.buyer.email ? wrap(`Email: ${data.buyer.email}`, fonts.regular, 8.5, lineW) : []),
  ];
  const buyerName = wrap(data.buyer.name.toUpperCase(), fonts.regular, 11, lineW);
  const rows = Math.max(by.length + 1, to.length + (buyerName.length - 1));
  const boxH = 50 + rows * 12 + 4;
  for (const [i, title, name, lines, gstin] of [
    [0, 'Billed By', [data.seller.name], by, data.seller.gstin],
    [1, 'Billed To', buyerName, to, ''],
  ] as const) {
    const x = M + i * (boxW + gap);
    roundedRect(page, x, boxTop, boxW, boxH, 6, BOX_FILL, BOX_LINE);
    text(page, title, x + pad, boxTop + 10, fonts.bold, 13);
    let ly = boxTop + 32;
    for (const n of name) {
      text(page, n, x + pad, ly, fonts.regular, 11);
      ly += 14;
    }
    ly += 2;
    for (const l of lines) {
      text(page, l, x + pad, ly, fonts.regular, 8.5);
      ly += 12;
    }
    if (gstin) {
      text(page, 'GSTIN: ', x + pad, ly, fonts.bold, 8.5);
      text(page, gstin, x + pad + fonts.bold.widthOfTextAtSize('GSTIN: ', 8.5), ly, fonts.regular, 8.5);
    }
  }
  const supplyTop = boxTop + boxH + 12;
  text(page, 'Country Of Supply: India', M + 24, supplyTop, fonts.regular, 9);
  text(page, `Place Of Supply: ${data.placeOfSupply}`, M + boxW + gap + 24, supplyTop, fonts.regular, 9);
  return supplyTop + 22;
}

// ── Item table ──
interface Col {
  key: string;
  label: string[];
  w: number;
  align: 'left' | 'right' | 'center';
}

function columns(interState: boolean): Col[] {
  const tax: Col[] = interState
    ? [{ key: 'igst', label: ['IGST'], w: 60, align: 'right' }]
    : [
        { key: 'cgst', label: ['CGST'], w: 48, align: 'right' },
        { key: 'sgst', label: ['SGST'], w: 48, align: 'right' },
      ];
  const fixed: Col[] = [
    { key: 'no', label: [''], w: 16, align: 'left' },
    { key: 'item', label: ['Item'], w: 0, align: 'left' },
    { key: 'hsn', label: ['HSN'], w: 34, align: 'left' },
    { key: 'rate%', label: ['GST', 'Rate'], w: 30, align: 'center' },
    { key: 'qty', label: ['Qty'], w: 36, align: 'center' },
    { key: 'rate', label: ['Rate'], w: 52, align: 'right' },
    { key: 'amount', label: ['Amount'], w: 56, align: 'right' },
    ...tax,
    { key: 'total', label: ['Total'], w: 60, align: 'right' },
  ];
  const used = fixed.reduce((s, c) => s + c.w, 0) + (fixed.length - 1) * 4;
  fixed[1].w = CONTENT_W - used;
  return fixed;
}

function colX(cols: Col[]): number[] {
  const xs: number[] = [];
  let x = M;
  for (const c of cols) {
    xs.push(x);
    x += c.w + 4;
  }
  return xs;
}

function drawTableHead(ctx: Ctx, cols: Col[], top: number): number {
  const { page, fonts } = ctx;
  const xs = colX(cols);
  page.drawRectangle({ x: M, y: Y(top), width: CONTENT_W, height: 2, color: INK });
  page.drawRectangle({ x: M, y: Y(top + 30), width: CONTENT_W, height: 30 - 2, color: rgb(0.97, 0.97, 0.97) });
  cols.forEach((c, i) => {
    c.label.forEach((l, j) => {
      const ty = top + 8 + j * 11;
      if (c.align === 'right') textRight(page, l, xs[i] + c.w, ty, fonts.bold, 9);
      else if (c.align === 'center') text(page, l, xs[i] + (c.w - fonts.bold.widthOfTextAtSize(l, 9)) / 2, ty, fonts.bold, 9);
      else text(page, l, xs[i] + (i === 1 ? 2 : 0), ty, fonts.bold, 9);
    });
  });
  page.drawRectangle({ x: M, y: Y(top + 32), width: CONTENT_W, height: 2, color: INK });
  return top + 32;
}

function lineHeight(ctx: Ctx, cols: Col[], line: InvoiceLine): { title: string[]; details: string[]; h: number } {
  const w = cols[1].w - 4;
  const title = wrap(line.description, ctx.fonts.regular, 9, w);
  const details = line.details.flatMap((d) => wrap(d, ctx.fonts.regular, 7.5, w));
  return { title, details, h: 10 + title.length * 11.5 + details.length * 10 + 8 };
}

function drawLine(ctx: Ctx, cols: Col[], top: number, n: number, line: InvoiceLine, laid: ReturnType<typeof lineHeight>) {
  const { page, fonts, data } = ctx;
  const xs = colX(cols);
  page.drawRectangle({ x: M, y: Y(top + laid.h), width: CONTENT_W, height: laid.h, color: TABLE_FILL });
  const ty = top + 10;
  const cell = (key: string) => cols.findIndex((c) => c.key === key);
  text(page, `${n}`, xs[0] + 4, ty, fonts.regular, 9);
  let y = ty;
  for (const t of laid.title) {
    text(page, t, xs[1] + 2, y, fonts.regular, 9);
    y += 11.5;
  }
  for (const d of laid.details) {
    text(page, d, xs[1] + 2, y, fonts.regular, 7.5, MUTED);
    y += 10;
  }
  text(page, line.hsn, xs[cell('hsn')], ty, fonts.regular, 9);
  const center = (key: string, s: string) => {
    const i = cell(key);
    text(page, s, xs[i] + (cols[i].w - fonts.regular.widthOfTextAtSize(s, 9)) / 2, ty, fonts.regular, 9);
  };
  center('rate%', `${data.gstRatePercent}%`);
  center('qty', `${line.quantity} ${line.unit}`);
  const right = (key: string, v: number) => {
    const i = cell(key);
    if (i >= 0) money(page, v, xs[i] + cols[i].w, ty, fonts.regular, 8.5);
  };
  right('rate', line.rate);
  right('amount', line.taxable);
  right('cgst', line.cgst);
  right('sgst', line.sgst);
  right('igst', line.igst);
  right('total', line.total);
  page.drawLine({ start: { x: M, y: Y(top + laid.h) }, end: { x: M + CONTENT_W, y: Y(top + laid.h) }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
}

function newPage(ctx: Ctx): number {
  ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.pages.push(ctx.page);
  return drawHeader(ctx);
}

function drawTable(ctx: Ctx, top: number): number {
  const cols = columns(ctx.data.interState);
  let y = drawTableHead(ctx, cols, top);
  ctx.data.lines.forEach((line, i) => {
    const laid = lineHeight(ctx, cols, line);
    if (y + laid.h > PAGE_H - FOOTER_H - 10) {
      y = drawTableHead(ctx, cols, newPage(ctx) + 6);
    }
    drawLine(ctx, cols, y, i + 1, line, laid);
    y += laid.h;
  });
  // Closing double rule, as on the shop's invoice.
  ctx.page.drawRectangle({ x: M, y: Y(y + 2), width: CONTENT_W, height: 1.2, color: INK });
  ctx.page.drawRectangle({ x: M, y: Y(y + 4.6), width: CONTENT_W, height: 1.2, color: INK });
  return y + 12;
}

// ── Payment details + totals ──
function drawSummary(ctx: Ctx, top: number): number {
  const { fonts, data } = ctx;
  const needed = 150;
  if (top + needed > PAGE_H - FOOTER_H) top = newPage(ctx) + 10;
  const page = ctx.page;

  if (data.discount) {
    const label = `${pdfSafe(fonts.regular, `Coupon ${data.discount.code}`)} applied: `;
    text(page, label, M + 4, top, fonts.regular, 8, MUTED);
    const lw = fonts.regular.widthOfTextAtSize(label, 8);
    const amt = formatInvoiceAmount(data.discount.amount);
    const rw = drawRupee(page, M + 4 + lw, top, 8, MUTED);
    text(page, `${amt} off, already deducted from the item values above.`, M + 4 + lw + rw + 1.5, top, fonts.regular, 8, MUTED);
    top += 16;
  }

  // Payment details box (in place of bank details / scan to pay).
  const boxW = 250;
  const boxH = 104;
  roundedRect(page, M, top, boxW, boxH, 6, BOX_FILL, BOX_LINE);
  text(page, 'Payment Details', M + 14, top + 12, fonts.bold, 13);
  const rows: [string, string][] = [
    ['Status:', 'Paid'],
    ['Paid On:', data.payment.paidOn],
    ['Method:', data.payment.method],
    ['Reference:', data.payment.reference || '-'],
  ];
  rows.forEach(([k, v], i) => {
    const ry = top + 36 + i * 15;
    text(page, k, M + 14, ry, fonts.regular, 9);
    const lines = wrap(v, fonts.regular, 9, boxW - 100);
    text(page, lines[0], M + 86, ry, i === 0 ? fonts.bold : fonts.regular, 9, i === 0 ? rgb(0.1, 0.5, 0.25) : INK);
  });

  // Totals.
  const right = M + CONTENT_W;
  const labelX = right - 210;
  let ty = top + 6;
  const tax: [string, number][] = data.interState
    ? [[`IGST (${data.gstRatePercent}%):`, data.totals.igst]]
    : [
        [`CGST (${data.gstRatePercent / 2}%):`, data.totals.cgst],
        [`SGST (${data.gstRatePercent / 2}%):`, data.totals.sgst],
      ];
  for (const [k, v] of [['Amount:', data.totals.taxable] as [string, number], ...tax]) {
    text(page, k, labelX, ty, fonts.regular, 13);
    money(page, v, right, ty, fonts.regular, 13);
    ty += 21;
  }
  page.drawLine({ start: { x: labelX - 10, y: Y(ty + 2) }, end: { x: right, y: Y(ty + 2) }, thickness: 0.8, color: rgb(0.55, 0.65, 0.8) });
  ty += 10;
  text(page, 'Total (INR):', labelX, ty, fonts.bold, 14);
  money(page, data.totals.total, right, ty, fonts.bold, 14);
  ty += 20;
  page.drawLine({ start: { x: labelX - 10, y: Y(ty) }, end: { x: right, y: Y(ty) }, thickness: 0.8, color: rgb(0.55, 0.65, 0.8) });
  ty += 8;
  const words = wrap(data.amountInWords, fonts.regular, 8, 220);
  words.forEach((w, i) => textRight(page, w, right, ty + i * 10, fonts.regular, 8, MUTED));
  return Math.max(top + boxH, ty + words.length * 10) + 10;
}

// ── Footer (every page) ──
const SIGNATURE_NOTE = [
  'This is an electronic invoice issued in accordance with the Information Technology Act, 2000, and does not',
  'require a signature (proviso to Rule 46 of the CGST Rules, 2017).',
];

function drawFooter(ctx: Ctx, page: PDFPage, pageNo: number, pageCount: number) {
  const { fonts, data, qr } = ctx;
  const top = PAGE_H - FOOTER_H + 6;
  page.drawLine({ start: { x: M, y: Y(top) }, end: { x: PAGE_W - M, y: Y(top) }, thickness: 0.75, color: COPPER });
  // Shop QR: scan to visit the website.
  const qrSize = 46;
  if (qr) {
    page.drawImage(qr, { x: M, y: Y(top + 10 + qrSize), width: qrSize, height: qrSize });
    text(page, 'Scan to shop', M + qrSize + 8, top + 14, fonts.bold, 8);
    text(page, 'www.weftoncopper.com', M + qrSize + 8, top + 26, fonts.regular, 8, MUTED);
  }
  // Invoice reference, centred.
  const mid = PAGE_W / 2;
  const ref = `${data.invoiceNumber}  ·  ${data.invoiceDate}`;
  text(page, ref, mid - fonts.regular.widthOfTextAtSize(ref, 8) / 2, top + 14, fonts.regular, 8);
  const pg = `Page ${pageNo} of ${pageCount}`;
  text(page, pg, mid - fonts.regular.widthOfTextAtSize(pg, 7.5) / 2, top + 26, fonts.regular, 7.5, MUTED);
  // Seller, right-aligned.
  const right = PAGE_W - M;
  textRight(page, data.seller.name, right, top + 12, fonts.bold, 9, TEAL);
  textRight(page, `${data.seller.constitution} · ${data.seller.businessType}`, right, top + 25, fonts.regular, 7.5, MUTED);
  textRight(page, `GSTIN: ${data.seller.gstin}`, right, top + 36, fonts.regular, 7.5, MUTED);
  SIGNATURE_NOTE.forEach((line, i) =>
    text(page, line, mid - fonts.regular.widthOfTextAtSize(line, 7) / 2, top + 64 + i * 9, fonts.regular, 7, MUTED)
  );
}

async function renderQr(url: string): Promise<Uint8Array | null> {
  try {
    const { toBuffer } = await import('bwip-js/node');
    return new Uint8Array(await toBuffer({ bcid: 'qrcode', text: url, scale: 4, paddingwidth: 0, paddingheight: 0 }));
  } catch (e) {
    console.warn('[invoicePdf] QR code skipped:', e);
    return null;
  }
}

/** The tax invoice for `data` as PDF bytes. */
export async function renderInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${data.invoiceNumber}`);
  pdf.setAuthor(data.seller.name);
  pdf.setCreator('Wefton Copper — Admin');
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  const logo = await pdf.embedJpg(Buffer.from(INVOICE_LOGO_JPG_BASE64, 'base64'));
  const qrBytes = await renderQr(data.seller.website);
  const qr = qrBytes ? await pdf.embedPng(qrBytes) : null;

  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const ctx: Ctx = { pdf, page, fonts, data, logo, qr, pages: [page] };
  let y = drawHeader(ctx);
  y = drawParties(ctx, y);
  y = drawTable(ctx, y);
  drawSummary(ctx, y);
  ctx.pages.forEach((p, i) => drawFooter(ctx, p, i + 1, ctx.pages.length));
  return pdf.save();
}
