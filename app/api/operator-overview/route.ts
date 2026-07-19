import handler from '../../../netlify/functions/operator-overview.mjs';
export const GET = (request: Request) => handler(request);
