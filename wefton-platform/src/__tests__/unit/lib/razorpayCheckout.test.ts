// ============================================================
// Wefton Copper — Razorpay Checkout display config
// ============================================================
import { describe, expect, it } from 'vitest';
import { displayConfigFor } from '@/lib/razorpay/checkout';

describe('displayConfigFor', () => {
  it.each(['upi', 'card', 'netbanking'] as const)('lists %s first and keeps the other methods', (method) => {
    const { display } = displayConfigFor(method);
    expect(display.sequence).toEqual(['block.chosen']);
    expect(display.blocks.chosen.instruments).toEqual([{ method }]);
    expect(display.preferences.show_default_blocks).toBe(true);
  });
});
