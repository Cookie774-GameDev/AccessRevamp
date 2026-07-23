import {
  assertJsonSize,
  assertMethod,
  assertSameOrigin,
  handleError,
  HttpError,
  json,
  readJsonBody,
} from './_shared/http.mjs';
import { createSupabasePublicClient } from './_shared/supabase-public.mjs';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_LIFETIME_SECONDS = 10 * 60;

function normalizeEmail(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(422, 'Email details are invalid.');
  }
  const keys = Object.keys(payload);
  if (keys.length !== 1 || keys[0] !== 'email') throw new HttpError(422, 'Email details are invalid.');
  const email = String(payload.email || '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new HttpError(422, 'Enter a valid email address.');
  return email;
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export function createAuthSignupResendHandler({
  getAdmin,
  createPublicClient = createSupabasePublicClient,
} = {}) {
  return async function authSignupResend(request) {
    let client;
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);
      const email = normalizeEmail(await readJsonBody(request));

      if (getAdmin) {
        const admin = getAdmin();
        const state = await admin.rpc('accessrevamp_auth_email_state', { p_email: email });
        if (!state.error && state.data === 'confirmed') {
          return json({ ok: false, code: 'ACCOUNT_EXISTS', next: '/login', emailHint: maskEmail(email) }, 409);
        }
        if (!state.error && state.data === 'missing') {
          return json({ ok: false, code: 'RESTART_SIGNUP' }, 409);
        }
      }

      client = createPublicClient();
      const redirectTo = new URL('/login?confirmed=1', request.headers.get('origin')).toString();
      const result = await client.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (result.error) {
        const status = Number(result.error.status || result.error.code || 0);
        if (status === 429) throw new HttpError(429, 'Please wait before requesting another email.');
        throw new HttpError(503, 'The confirmation email could not be sent. Try again shortly.');
      }
      return json({ ok: true, emailHint: maskEmail(email), expiresIn: EMAIL_LIFETIME_SECONDS }, 202);
    } catch (error) {
      return handleError(error);
    } finally {
      if (client) await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
  };
}

export default createAuthSignupResendHandler();
