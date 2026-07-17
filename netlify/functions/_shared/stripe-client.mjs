import Stripe from 'stripe';

export const STRIPE_API_VERSION = '2026-06-24.dahlia';
export const STRIPE_INTEGRATION_IDENTIFIER = 'accessrevamp_web_qmrxvpta';

let client;

export function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('Stripe server configuration is missing.');
  if (!client) {
    client = new Stripe(secret, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: 2,
      appInfo: {
        name: 'AccessRevamp',
        version: '1.0.0',
      },
    });
  }
  return client;
}
