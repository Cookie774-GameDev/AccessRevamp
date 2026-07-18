import { HttpError } from './http.mjs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BEARER_PATTERN = /^Bearer ([A-Za-z0-9._~-]{1,4096})$/i;

export async function requireConfirmedUser(request, supabaseAdmin) {
  if (!supabaseAdmin?.auth || typeof supabaseAdmin.auth.getUser !== 'function') {
    throw new HttpError(503, 'Authentication service is unavailable.');
  }

  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(BEARER_PATTERN);
  if (!match) throw new HttpError(401, 'Authentication required.');

  let result;
  try {
    result = await supabaseAdmin.auth.getUser(match[1]);
  } catch {
    throw new HttpError(503, 'Authentication service is unavailable.');
  }

  const user = result?.data?.user;
  if (result?.error || !user) throw new HttpError(401, 'Authentication required.');
  if (!user.email_confirmed_at) {
    throw new HttpError(403, 'A confirmed email address is required.');
  }

  const id = String(user.id || '');
  const email = String(user.email || '').trim().toLowerCase();
  if (!UUID_PATTERN.test(id) || !email || email.length > 254 || !email.includes('@')) {
    throw new HttpError(401, 'Authentication required.');
  }

  return Object.freeze({ id, email });
}
