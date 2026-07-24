import handler from '../../../netlify/functions/account-project-feedback.mjs';

export const POST = (request: Request) => handler(request);
