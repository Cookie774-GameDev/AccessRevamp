import { TIERS } from './config/tier-catalog.js';

export const plans = TIERS;

const paymentMode = import.meta.env.VITE_PAYMENT_MODE === 'live' ? 'live' : 'test';

export const siteConfig = Object.freeze({
  name: 'AccessRevamp',
  siteUrl: (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, ''),
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  paymentMode,
  checkoutIsSandbox: paymentMode === 'test',
});

export const servicePromise = Object.freeze([
  'Clear scope before payment',
  'Human-reviewed findings',
  'One-time pricing only',
  'No surprise add-on platform fee',
]);
