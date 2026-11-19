import Link from 'next/link';
import { BRAND } from '@/config/brand';

/**
 * Return, replacement and refund policy (WC-Issue-6). Shared by /returns and
 * /refund-policy so the two pages can never disagree.
 */
export default function ReturnPolicyContent() {
  const linkClass = 'text-[var(--copper-light)] hover:underline';
  return (
    <div className="space-y-8 text-sm text-[var(--text-muted)] leading-relaxed">
      <section>
        <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Request Window</h2>
        <p>
          You can raise a return, replacement or refund request within <strong>7 days</strong> of
          receiving your order.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">Before You Order</h2>
        <p>
          Please check the{' '}
          <Link href="/size-guide" className={linkClass}>
            Size Guide
          </Link>{' '}
          for the product and choose the size that fits your requirement before placing your
          order. Returns are not accepted for a size that was ordered correctly but does not fit
          as expected.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">
          When a Request Is Accepted
        </h2>
        <p className="mb-3">
          A return with a replacement or refund is accepted only in the following cases:
        </p>
        <ol className="list-[lower-alpha] list-inside space-y-2">
          <li>The product sent is a different size from the one you ordered.</li>
          <li>The product sent is for a different gender from the one you ordered.</li>
          <li>The product sent is a different colour from the one you ordered.</li>
          <li>The product is received in a damaged condition.</li>
          <li>The package is received damaged and the product inside is also damaged.</li>
          <li>Anything other than the product you ordered is received.</li>
        </ol>
        <p className="mt-3">
          Requests for any other reason, including a change of mind, cannot be accepted. Please
          keep the product unused, with its tags and original packaging, until your request is
          resolved.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">What to Send Us</h2>
        <p>
          With your request, please share clear photos or screenshots of the product you received,
          and of any damage to the product or package. Where the size, colour or gender is
          different from your order, include a photo of the product label showing it.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">How to Raise a Request</h2>
        <p className="mb-3">
          Wefton Copper sells only online and has no retail store, so returns and replacements are
          arranged online. Contact our support team through any of these channels, with your order
          number:
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>
            WhatsApp:{' '}
            <a
              href={`https://wa.me/${BRAND.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {BRAND.phone}
            </a>{' '}
            (chat only, no calls)
          </li>
          <li>
            Website: the{' '}
            <Link href="/contact" className={linkClass}>
              Contact Us
            </Link>{' '}
            page
          </li>
          <li>
            Email:{' '}
            <a href={`mailto:${BRAND.email}`} className={linkClass}>
              {BRAND.email}
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium text-[var(--text-light)] mb-3">
          Replacement and Refund
        </h2>
        <p>
          Our team will review your request and reply within 1–2 business days with the next
          steps for returning the product. Because every accepted case is an error on our side or
          in transit, you will not be charged for the return. Once the request is approved, we
          will send a replacement (subject to stock) or, if you prefer, refund the full amount to
          your original payment method. Refunds usually reach your account within 5–7 business
          days, depending on your bank or payment provider.
        </p>
      </section>
    </div>
  );
}
