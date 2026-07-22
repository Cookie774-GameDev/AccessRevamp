import { TIERS } from './config/tier-catalog.js';

export const plans = TIERS;

const paymentMode = import.meta.env.VITE_PAYMENT_MODE === 'live' ? 'live' : 'test';

// Supabase's project URL and publishable key are intentionally public browser
// configuration. Keep environment overrides for rotation and alternate builds,
// while providing the production project as a safe fallback so a Netlify build
// cannot silently ship with authentication disabled.
const DEFAULT_SUPABASE_URL = 'https://vbkkimvedmklebghtkzs.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WD8hNud9SZMDg6uK0N2cAA_4hnxz2ta';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
  || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const siteConfig = Object.freeze({
  name: 'AccessRevamp',
  siteUrl: (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, ''),
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || '',
  supabaseUrl: supabaseUrl.replace(/\/$/, ''),
  supabaseKey,
  paymentMode,
  checkoutIsSandbox: paymentMode === 'test',
});

export const servicePromise = Object.freeze([
  'Clear scope before payment',
  'Human-reviewed findings',
  'One-time pricing only',
  'No surprise add-on platform fee',
]);