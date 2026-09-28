// ============================================================
// Wefton Copper — Try-On Terms & Conditions
// ============================================================
// Single source of truth for the Try-On terms, shown in the consent gate
// and mirrored on the legal/reference page so they never drift apart.

export interface TryOnTermsClause {
  title: string;
  body: string;
}

export const TRYON_TERMS: TryOnTermsClause[] = [
  {
    title: 'Your photo stays on your device',
    body:
      'For this free Try-On, your uploaded photo is processed entirely in your browser and is held only in temporary memory for this session. It is never uploaded to Wefton, never saved, and never shared with anyone. It is permanently deleted the moment you go to checkout, move to another page, close this window, or leave the site.',
  },
  {
    title: 'Upload only your own photo',
    body:
      'Please upload a photo of yourself only. Do not upload photos of children, of other or familiar people, or any confidential, private, or restricted images. By continuing, you confirm the photo is of you and that you have the right to use it.',
  },
  {
    title: 'Approximate visualization',
    body:
      'This preview is an approximate styling visualization, not a photograph, and not an exact representation of fit, size, colour, drape, or appearance. Please use it as a rough guide only.',
  },
  {
    title: 'No liability for misuse',
    body:
      'Wefton Copper cannot be held responsible for any misuse, misinterpretation, or consequences of graphical content generated through this feature. Do not use this feature to create misleading, harmful, or non-consensual imagery.',
  },
];

/** Short consent-checkbox label shown next to the acceptance control. */
export const TRYON_CONSENT_LABEL =
  'I have read and agree to the Try-On terms above. This is my own photo and I understand it is processed only on my device and deleted when I leave.';
