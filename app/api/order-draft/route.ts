import handler from '../../../netlify/functions/order-draft.mjs';
export const POST = (request: Request) => handler(request);
