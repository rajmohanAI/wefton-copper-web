// ============================================================
// Wefton Copper — Try-On Provider Factory
// ============================================================
// Returns the active Try-On provider based on config. The rest of the app
// depends only on the TryOnProvider interface, so swapping to a paid AI
// provider later is a one-line config change here.

import type { TryOnProvider } from './types';
import { ACTIVE_TRYON_PROVIDER } from '@/config/tryon';
import { OnDeviceCompositeProvider } from './onDeviceCompositeProvider';

let cached: TryOnProvider | null = null;

export function getTryOnProvider(): TryOnProvider {
  if (cached) return cached;
  switch (ACTIVE_TRYON_PROVIDER) {
    case 'on-device':
    default:
      cached = new OnDeviceCompositeProvider();
      break;
  }
  return cached;
}

export type { TryOnProvider, TryOnInput, TryOnResult } from './types';
