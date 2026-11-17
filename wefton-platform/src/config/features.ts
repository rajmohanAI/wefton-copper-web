// ============================================================
// Wefton Copper — content switches
// ============================================================
// Blocks that are built but hidden for now. Flip a switch to `true`
// to bring the block back; nothing else needs to change.

export const FEATURES = {
  /**
   * Homepage "Coming Soon" placeholder shown under Featured Collection when
   * no product is marked featured. Turn on when a new product is being
   * teased (WC-Issue-1).
   */
  comingSoonBlock: false,
  /**
   * "Copper-Stitched Craftsmanship" block on the homepage and the matching
   * card on the Vision page. Current products have no copper-based seams or
   * stitching, so it stays off until they do (WC-Issue-2).
   */
  copperStitchedCraftsmanship: false,
} as const;
