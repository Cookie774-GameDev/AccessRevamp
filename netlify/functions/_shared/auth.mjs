import { Buffer } from 'node:buffer';
import { HttpError } from './http.mjs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BEARER_PATTERN = /^Bearer ([A-Za-z0-9._~-]{1,8192})$/i;
const EMAIL_AUTH_METHODS = new Set(['otp', 'magiclink']);

function accessTokenPayload(accessToken) {
  const parts = String(accessToken || '').split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null;
  } catch {
    return null;
  }
}

function sessionIdFromPayload(payload) {
  const sessionId = String(payload?.session_id || '');
  return UUID_PATTERN.test(sessionId) ? sessionId : null;
}

function hasInboxAuthentication(payload) {
  return Array.isArray(payload?.amr) && payload.amr.some((factor) => (
    factor
    && typeof factor === 'object'
    && EMAIL_AUTH_METHODS.has(String(factor.method || '').toLowerCase())
  ));
}

export function bearerAccessToken(request) {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(BEARER_PATTERN);
  if (!match) throw new HttpError(401, 'Authentication required.');
  return match[1];
}

async function verifiedSessionExists(client, user, sessionId) {
  let callerScopedUnverified = false;

  if (client && typeof client.rpc === 'function') {
    const result = await client.rpc('accessrevamp_current_session_is_verified');
    if (!result.error && result.data === true) return true;
    if (!result.error && result.data === false) callerScopedUnverified = true;
  }

  if (!client || typeof client.from !== 'function') {
    if (callerScopedUnverified) return false;
    throw new HttpError(503, 'Sign-in verification is unavailable.');
  }

  const verification = await client
    .from('accessrevamp_verified_sessions')
    .select('session_id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (verification.error) {
    // A user-scoped client is expected to be denied direct access to the
    // server-only verification table. In that case, the authenticated RPC
    // result remains authoritative. A service client can read the row and
    // therefore supplies the compatibility path for server-only operations.
    if (callerScopedUnverified) return false;
    throw new HttpError(503, 'Sign-in verification is unavailable.');
  }
  return Boolean(verification.data);
}

export async function requireConfirmedUser(
  request,
  authClient,
  {
    requireVerifiedSession = true,
    requireInboxAuthentication = false,
  } = {},
) {
  const accessToken = bearerAccessToken(request);
  if (!authClient?.auth || typeof authClient.auth.getUser !== 'function') {
    throw new HttpError(503, 'Authentication service is unavailable.');
  }

  let result;
  try {
    result = await authClient.auth.getUser(accessToken);
  } catch {
    throw new HttpError(503, 'Authentication service is unavailable.');
  }

  const user = result?.data?.user;
  if (result?.error || !user) throw new HttpError(401, 'Authentication required.');
  if (!user.email_confirmed_at) {
    throw new HttpError(403, 'A confirmed email address is required.');
  }

  // The token has already been validated by Supabase getUser above. Decode its
  // claims only after validation so the session and AMR checks cannot trust a
  // caller-forged token.
  const payload = accessTokenPayload(accessToken);
  const id = String(user.id || '');
  const email = String(user.email || '').trim().toLowerCase();
  const sessionId = sessionIdFromPayload(payload);
  if (!UUID_PATTERN.test(id) || !email || email.length > 254 || !email.includes('@') || !sessionId) {
    throw new HttpError(401, 'Authentication required.');
  }

  if (requireInboxAuthentication && !hasInboxAuthentication(payload)) {
    throw new HttpError(403, 'Complete email verification to continue.');
  }

  if (requireVerifiedSession && !(await verifiedSessionExists(authClient, { id }, sessionId))) {
    throw new HttpError(403, 'Complete password and email verification to continue.');
  }

  return Object.freeze({ id, email, sessionId });
}
