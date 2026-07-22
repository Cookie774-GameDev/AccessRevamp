import { createHash } from 'node:crypto';
import { requireConfirmedUser } from './_shared/auth.mjs';
import {
  assertJsonSize,
  assertMethod,
  assertSameOrigin,
  handleError,
  HttpError,
  json,
  readJsonBody,
} from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

function readChallengeToken(payload) {
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

export function createAuthLoginCompleteHandler({ getAdmin = getSupabaseAdmin } = {}) {
  return async function authLoginComplete(request) {
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);
      const challengeToken = readChallengeToken(await readJsonBody(request));
      const admin = getAdmin();
      const user = await requireConfirmedUser(request, admin, { requireVerifiedSession: false });
      const challengeHash = createHash('sha256').update(challengeToken).digest('hex');

      const result = await admin.rpc('complete_accessrevamp_email_signin', {
        p_challenge_hash: challengeHash,
        p_user_id: user.id,
        p_session_id: user.sessionId,
      });
      if (result.error || result.data?.verified !== true) {
        throw new HttpError(401, 'Email verification is invalid or expired.');
      }

      await admin
        .from('accessrevamp_login_challenges')
        .update({ status: 'canceled' })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      return json({
        ok: true,
        verifiedAt: result.data.verified_at || new Date().toISOString(),
      });
    } catch (error) {
      return handleError(error);
    }
  };
}

export default createAuthLoginCompleteHandler();
