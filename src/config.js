export const plans = Object.freeze({
  homepage_reveal: Object.freeze({
    key: 'homepage_reveal',
    name: 'Homepage Reveal',
    amount: 5000,
    displayPrice: '$50',
    cadence: 'one-time',
    stripePriceId: import.meta.env.VITE_STRIPE_HOMEPAGE_REVEAL_PRICE_ID || 'price_1TuGoNLzyGRcyGQJRjtGsiMV',
    checkoutUrl: import.meta.env.VITE_STRIPE_HOMEPAGE_REVEAL_URL || 'https://book.stripe.com/test_dRmdRabhid0QfBfedagQE00',
  }),
  quick_fix: Object.freeze({
    key: 'quick_fix',
    name: 'Quick Fix Plan',
    amount: 19900,
    displayPrice: '$199',
    cadence: 'one-time',
    stripePriceId: import.meta.env.VITE_STRIPE_QUICK_FIX_PRICE_ID || 'price_1TuGoTLzyGRcyGQJfdkqoE3f',
    checkoutUrl: import.meta.env.VITE_STRIPE_QUICK_FIX_URL || 'https://book.stripe.com/test_cNi00k99a1i81Kp6KIgQE01',
    creativePack: Object.freeze({
      totalVariations: 10,
      masterDirections: 2,
      formatsPerDirection: 5,
      formats: Object.freeze([
        'Square feed — 1080 × 1080',
        'Portrait feed — 1080 × 1350',
        'Story / Reel cover — 1080 × 1920',
        'Landscape ad — 1200 × 628',
        'US Letter / A4 poster',
      ]),
      canvaReady: true,
      canvaFreeCompatibleByDefault: true,
      revisionRounds: 1,
      campaignCount: 1,
    }),
  }),
  cinematic_scroll: Object.freeze({
    key: 'cinematic_scroll',
    name: 'Cinematic Scroll Site',
    amount: 25000,
    displayPrice: '$250',
    cadence: 'one-time',
    stripePriceId: import.meta.env.VITE_STRIPE_CINEMATIC_SCROLL_PRICE_ID || 'price_1TuNWjLzyGRcyGQJ5NNWNU88',
    checkoutUrl: import.meta.env.VITE_STRIPE_CINEMATIC_SCROLL_URL || 'https://book.stripe.com/test_6oU8wQ7125yo2Ot4CAgQE04',
    deliveryBusinessDays: 3,
    motionSequenceCount: 1,
    maximumStoryBeats: 4,
    revisionRounds: 1,
    mobileFallback: true,
    reducedMotionFallback: true,
  }),
});

export const siteConfig = Object.freeze({
  name: 'AccessRevamp',
  siteUrl: (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, ''),
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  checkoutIsSandbox: Object.values(plans).some((plan) => plan.checkoutUrl.includes('/test_')),
});

export const servicePromise = Object.freeze([
  'Clear scope before payment',
  'Human-reviewed findings',
  'One-time pricing only',
  'No surprise add-on platform fee',
]);
