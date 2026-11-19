// ============================================================
// Wefton Copper — "Join our family" sign-up (browser)
// Goes through /api/newsletter/subscribe, which saves the member and
// sends the welcome email.
// ============================================================

/**
 * Adds an email to the "Join our family" list.
 * `success` is false when the email is already on the list.
 */
export async function subscribeNewsletter(email: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });
  const body = (await res.json().catch(() => ({}))) as { result?: string; message?: string; error?: string };
  if (!res.ok) throw new Error(body.error || 'Subscribing failed');
  return { success: body.result !== 'already', message: body.message || 'Welcome to the family!' };
}
