import handler from '../../../netlify/functions/free-snapshot.mjs';
export const POST = (request: Request) => handler(request);
