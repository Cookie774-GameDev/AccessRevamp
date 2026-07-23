import { bearerAccessToken, requireConfirmedUser } from './_shared/auth.mjs';
import {
  assertJsonSize,
  assertMethod,
  assertSameOrigin,
  handleError,
  HttpError,
  json,
  readJsonBody,
} from './_shared/http.mjs';
import { createSupabaseAccessTokenClient } from './_shared/supabase-public.mjs';

const CHALLENGE_COOKIE = 'accessrevamp_login_challenge';
const CHALLENGE_COOKIE_PATH = '/api/auth-login-complete';
const TOKEN_PATTERN = /^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{32,128})$/;

function cookieValue(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(separator + 1).trim()); } catch { return ''; }
  }
  return '';
}

function clearChallengeCookie(request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${CHALLENGE_COOKIE}=; Path=${CHALLENGE_COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

async function readChallengeToken(request) {
  const cookieToken = cookieValue(request, CHALLENGE_COOKIE);
  if (TOKEN_PATTERN.test(cookieToken)) return cookieToken;

  // Compatibility fallback for verification links issued before the current rollout.
  const payload = await readJsonBody(request);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(422, 'Verification details are invalid.');
  }
  const keys = Object.keys(payload);
  if (keys.length !== 1 || keys[0] !== 'challengeToken') {
    throw new HttpError(422, 'Verification details are invalid.');
  }
  const token = String(payload.challengeToken || '');
  if (!TOKEN_PATTERN.test(token)) throw new HttpError(422, 'Verification details are invalid.');
  return token;
}

export function createAuthLoginCompleteHandler({
  createAccessTokenClient = createSupabaseAccessTokenClient,
} = {}) {
  return async function authLoginComplete(request) {
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);
      const challengeToken = await readChallengeToken(request);
      const accessToken = bearerAccessToken(request);
      const client = createAccessTokenClient(accessToken);
      await requireConfirmedUser(request, client, { requireVerifiedSession: false });

      const result = await client.rpc('complete_accessrevamp_email_signin_current', {
        p_challenge_token: challengeToken,
      });
      if (result.error || result.data?.verified !== true) {
        throw new HttpError(401, 'Email verification is invalid or expired.');
      }

      return json({
        ok: true,
        verifiedAt: result.data.verified_at || new Date().toISOString(),
      }, 200, {
        'set-cookie': clearChallengeCookie(request),
      });
    } catch (error) {
      const response = handleError(error);
      response.headers.set('set-cookie', clearChallengeCookie(request));
      return response;
    }
  };
}

export default createAuthLoginCompleteHandler();
