import { describe, it, expect } from 'vitest';
import { productFabric } from '@/lib/productFabric';
import type { WashCareGuide } from '@/config/washCare';

const guide = (fabric: string) => ({ fabric } as unknown as WashCareGuide);

describe('productFabric', () => {
  it('uses the supplier composition set on the product', () => {
    expect(productFabric({ fabric: ' 60% cotton, 40% polyester ', careGuide: guide('100% cotton') })).toBe('60% cotton, 40% polyester');
  });

  it("falls back to the product's own uploaded care guide", () => {
    expect(productFabric({ careGuide: guide('100% polyester') })).toBe('100% polyester');
  });

  it('never assumes cotton when nothing is stated', () => {
    expect(productFabric({})).toBe('');
    expect(productFabric({ fabric: '', careGuide: null })).toBe('');
  });
});
