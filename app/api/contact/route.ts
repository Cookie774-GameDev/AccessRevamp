import handler from '../../../netlify/functions/contact.mjs';
export const POST = (request: Request) => handler(request);
