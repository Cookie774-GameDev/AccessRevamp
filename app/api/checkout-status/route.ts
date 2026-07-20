import handler from '../../../netlify/functions/checkout-status.mjs';
export const GET = (request: Request) => handler(request);
