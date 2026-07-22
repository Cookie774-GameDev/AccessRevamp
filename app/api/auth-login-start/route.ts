import handler from '../../../netlify/functions/auth-login-start.mjs';
export const POST = (request: Request) => handler(request);
