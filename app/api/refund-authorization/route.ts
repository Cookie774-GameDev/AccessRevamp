import handler from '../../../netlify/functions/refund-authorization.mjs';
export const POST = (request: Request) => handler(request);
