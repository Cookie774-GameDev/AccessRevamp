import handler from '../../../netlify/functions/refund-execute.mjs';
export const POST = (request: Request) => handler(request);
