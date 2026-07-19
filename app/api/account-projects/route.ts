import handler from '../../../netlify/functions/account-projects.mjs';
export const GET = (request: Request) => handler(request);
