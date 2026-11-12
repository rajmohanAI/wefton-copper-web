// ============================================================
// Wefton Copper — Mock payments (dev testing only)
// "Submit Payment" marks an order paid without any money changing hands,
// so checkout features can be tried on the dev site. It works only where
// MOCK_PAYMENTS_ENABLED=true is set (apphosting.dev.yaml), and only for
// admins: dev and the live site share one Firestore database.
// ============================================================

/** Read at request time, never baked into the build. */
export function isMockPaymentEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.MOCK_PAYMENTS_ENABLED === 'true';
}
