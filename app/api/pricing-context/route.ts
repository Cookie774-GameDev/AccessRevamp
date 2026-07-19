import handler from '../../../netlify/functions/pricing-context.mjs';
export const GET = (request: Request) => handler(request);
