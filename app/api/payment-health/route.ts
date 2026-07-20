import handler from '../../../netlify/functions/payment-health.mjs';
export const GET = (request: Request) => handler(request);
