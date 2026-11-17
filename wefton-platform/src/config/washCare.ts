// ============================================================
// Wefton Copper — wash care content (WC-Issue-11)
// ============================================================
// Care guides are data, so the Wash Care page can show the guide for the
// product a customer picks, and new products can add their own guide.

export interface CareSection {
  title: string;
  items: string[];
}

export interface WashCareGuide {
  /** Stable id, referenced from a product's `careGuideId`. */
  id: string;
  /** Shown in the product picker on the Wash Care page. */
  name: string;
  /** Fabric and construction the guide applies to. */
  fabric: string;
  /** Short care-label summary shown as chips at the top. */
  quickCare: string[];
  sections: CareSection[];
  avoid: string[];
  note?: string;
}

/** Standard guide for the current range: 100% cotton crew neck T-shirts. */
export const STANDARD_COTTON_TEE_GUIDE: WashCareGuide = {
  id: 'cotton-crew-neck',
  name: 'Cotton Crew Neck T-shirt',
  fabric: '100% cotton, knitted jersey',
  quickCare: [
    'Machine wash cold, up to 30°C',
    'Gentle cycle',
    'Do not bleach',
    'Do not tumble dry',
    'Iron on medium heat, inside out',
    'Do not dry clean',
  ],
  sections: [
    {
      title: 'Before the First Wash',
      items: [
        'Wash the garment separately for the first two washes, as some colour may release.',
        'Check the care label inside the garment; where it differs from this guide, follow the label.',
      ],
    },
    {
      title: 'Washing',
      items: [
        'Turn the garment inside out to protect the outer surface and any print.',
        'Machine wash in cold water, up to 30°C, on a gentle cycle, or hand wash in cold water.',
        'Wash with similar colours, and use a mild liquid detergent.',
        'Do not soak for long periods, and do not overload the machine.',
      ],
    },
    {
      title: 'Drying',
      items: [
        'Gently reshape the garment while it is damp, then hang or lay it flat to dry in the shade.',
        'Avoid long exposure to direct sunlight, which can fade the colour.',
        'Do not tumble dry. Cotton can shrink at high temperatures.',
      ],
    },
    {
      title: 'Ironing',
      items: [
        'Iron inside out on medium heat (up to 150°C), or use steam.',
        'Do not iron directly over any print or label.',
      ],
    },
    {
      title: 'Storage',
      items: [
        'Fold the garment, or hang it on a wide hanger to keep the shoulders in shape.',
        'Store in a cool, dry and well-ventilated place.',
      ],
    },
  ],
  avoid: [
    'Bleach or chlorine-based products',
    'Hot water above 30°C',
    'Tumble drying',
    'Dry cleaning',
    'Wringing or twisting the garment',
  ],
  note:
    'Following this guide will help your Wefton Copper garment keep its shape, colour and softness for a longer period.',
};

export const WASH_CARE_GUIDES: WashCareGuide[] = [STANDARD_COTTON_TEE_GUIDE];
