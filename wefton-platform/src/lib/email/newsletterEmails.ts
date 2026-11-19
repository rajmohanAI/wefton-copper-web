// ============================================================
// Wefton Copper — "Join our family" emails (pure, no I/O)
// ============================================================
import { BRAND } from '@/config/brand';
import { teaser, type SocialPost } from '@/lib/newsletter';
import { COPPER, escapeHtml, layout, SITE, type EmailContent } from './orderEmails';

const SOURCE_LABEL: Record<SocialPost['source'], string> = { instagram: 'Instagram', x: 'X' };

function unsubscribeFooter(unsubscribeUrl: string): string {
  return `<p style="margin:10px 0 0;">You're getting this because you joined the Wefton Copper family.
    <a href="${escapeHtml(unsubscribeUrl)}" style="color:${COPPER};">Unsubscribe</a> anytime.</p>`;
}

function followLinks(): string {
  return `<p style="text-align:center;margin:24px 0 0;font-size:14px;">
    Follow us on
    <a href="${BRAND.social.instagram}" style="color:${COPPER};font-weight:600;">Instagram</a> and
    <a href="${BRAND.social.twitter}" style="color:${COPPER};font-weight:600;">X</a>
    for stories, exciting offers, new arrivals and lifestyle.
  </p>`;
}

function postCard(post: SocialPost): string {
  const image = post.imageUrl
    ? `<a href="${escapeHtml(post.url)}"><img src="${escapeHtml(post.imageUrl)}" alt="" width="572" style="display:block;width:100%;max-width:572px;height:auto;border-radius:6px;" /></a>`
    : '';
  return `<div style="margin:0 0 26px;">
    ${image}
    <p style="margin:10px 0 6px;color:#333;font-size:14px;">${escapeHtml(teaser(post.text) || 'New from Wefton Copper')}</p>
    <a href="${escapeHtml(post.url)}" style="color:${COPPER};font-size:13px;font-weight:600;text-decoration:none;">See it on ${SOURCE_LABEL[post.source]} &rarr;</a>
  </div>`;
}

/** Welcome note sent right after someone joins. */
export function welcomeEmail(unsubscribeUrl: string): EmailContent {
  return {
    subject: 'Welcome to the Wefton Copper family',
    html: layout(
      `
      <h2 style="margin:0 0 6px;font-size:20px;">Welcome to the family!</h2>
      <p style="color:#444;">Thank you for joining us. Once a month we'll send you the best of what we've been sharing: stories, exciting offers, new arrivals and a little lifestyle inspiration.</p>
      <p style="text-align:center;margin:22px 0;">
        <a href="${SITE}/new-arrivals" style="display:inline-block;background:${COPPER};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:600;">See what's new</a>
      </p>
      ${followLinks()}
    `,
      unsubscribeFooter(unsubscribeUrl)
    ),
  };
}

/** The monthly email: a few of our latest posts. */
export function monthlyNewsletterEmail(posts: SocialPost[], unsubscribeUrl: string): EmailContent {
  return {
    subject: 'This month at Wefton Copper: stories, offers and new arrivals',
    html: layout(
      `
      <h2 style="margin:0 0 6px;font-size:20px;">Hello from the Wefton Copper family</h2>
      <p style="color:#444;margin:0 0 22px;">Here's a little of what we've been up to lately.</p>
      ${posts.map(postCard).join('')}
      <p style="text-align:center;margin:8px 0 0;">
        <a href="${SITE}/new-arrivals" style="display:inline-block;background:${COPPER};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:600;">Shop new arrivals</a>
      </p>
      ${followLinks()}
    `,
      unsubscribeFooter(unsubscribeUrl)
    ),
  };
}
