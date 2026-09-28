// ============================================================
// Wefton Copper — Try-On Provider Interface
// ============================================================
// The UI, consent flow, and ephemeral photo handling depend only on this
// interface — never on a concrete provider. This lets us swap the free
// on-device provider for a paid AI provider later without UI/privacy changes.

export interface TryOnInput {
  /** The user's photo — in-memory Blob only, never persisted. */
  photo: Blob;
  /** Garment image URL: dedicated try-on cutout if available, else product primary. */
  garmentImageUrl: string;
  /** Optional body inputs used to scale the composite. */
  heightCm?: number;
  size?: string;
  gender?: 'men' | 'women' | 'unisex';
}

export interface TryOnResult {
  /** Object URLs for the composite frame(s); revoked on cleanup. */
  frames: string[];
  /** The primary frame to show first. */
  primaryFrame: string;
  /** Whether body landmarks were detected in the photo. */
  landmarksFound: boolean;
  /** Approximate-visualization notice to display alongside the result. */
  note: string;
}

export interface TryOnProvider {
  readonly id: string;
  /**
   * Whether this provider transmits the user's photo off the device.
   * false for the on-device provider. When true, the Terms & Conditions
   * MUST disclose external processing (gates enabling such a provider).
   */
  readonly transmitsPhotoExternally: boolean;
  /** Whether the current browser/device can run this provider. */
  isSupported(): Promise<boolean>;
  /** Generate the try-on preview. */
  generate(input: TryOnInput, signal?: AbortSignal): Promise<TryOnResult>;
}

export const APPROXIMATE_NOTICE =
  'This is an approximate visualization for styling reference only — not a photograph, and not an exact representation of fit, size, colour, or drape.';
