import handler from '../../../netlify/functions/stripe-webhook.mjs';
export const POST = (request: Request) => handler(request);
