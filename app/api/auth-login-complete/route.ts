import handler from '../../../netlify/functions/auth-login-complete.mjs';
export const POST = (request: Request) => handler(request);
