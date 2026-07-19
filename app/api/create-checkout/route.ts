import handler from '../../../netlify/functions/create-checkout.mjs';
export const POST = (request: Request) => handler(request);
