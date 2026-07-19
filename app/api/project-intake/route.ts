import handler from '../../../netlify/functions/project-intake.mjs';
export const POST = (request: Request) => handler(request);

