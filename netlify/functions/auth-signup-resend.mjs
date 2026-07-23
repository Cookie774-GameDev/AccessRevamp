import { createHmac } from 'node:crypto';
import {
  assertJsonSize,
  assertMethod,
  assertSameOrigin,
  handleError,
  HttpError,
  json,
  readJsonBody,
  requestIp,
} from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { createSupabasePublicClient } from './_shared/supabase-public.mjs';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_LIFETIME_SECONDS = 10 * 60;

function normalizeEmail(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(422, 'Email details are invalid.');
  }
  const keys = Object.keys(payload);
  if (keys.length !== 1 || keys[0] !== 'email') {
    throw new HttpError(422, 'Email details are invalid.');
  }
  const email = String(payload.email || '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new HttpError(422, 'Enter a valid email address.');
  }
  return email;
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function requestRateKey(secret, scope, value) {
  return createHmac('sha256', secret).update(`${scope}:${value}`).digest('hex');
}

async function consumeAttempt(admin, request, email, env = process.env) {
  const secret = String(env.AUTH_RATE_LIMIT_SECRET || env.CONTACT_RATE_LIMIT_SECRET || '');
  if (secret.length < 24) throw new HttpError(503, 'Account protection is unavailable.');
  const ip = requestIp(request);
  const result = await admin.rpc('consume_accessrevamp_auth_attempt', {
    p_ip_key: requestRateKey(secret, 'signup-resend-ip', ip),
    p_account_key: requestRateKey(secret, 'signup-resend-account', `${ip}:${email}`),
  });
  if (result.error) {
    if (/rate limit/i.test(result.error.message || '')) {
      throw new HttpError(429, 'Too many email requests. Try again later.');
    }
    throw new HttpError(503, 'Account protection is unavailable.');
  }
}

export function createAuthSignupResendHandler({
  getAdmin = getSupabaseAdmin,
  createPublicClient = createSupabasePublicClient,
} = {}) {
  return async function authSignupResend(request) {
    let publicClient;
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);
      const email = normalizeEmail(await readJsonBody(request));
      const admin = getAdmin();
      await consumeAttempt(admin, request, email);
      const stateResult = await admin.rpc('accessrevamp_auth_email_state', { p_email: email });
      if (stateResult.error || !['missing', 'unconfirmed', 'confirmed'].includes(stateResult.data)) {
        throw new HttpError(503, 'Account lookup is unavailable.');
      }
      if (stateResult.data === 'confirmed') {
        return json({ ok: false, code: 'ACCOUNT_EXISTS', next: '/login', emailHint: maskEmail(email) }, 409);
      }
      if (stateResult.data === 'missing') {
        return json({ ok: false, code: 'RESTART_SIGNUP' }, 409);
      }

      publicClient = createPublicClient();
      const redirectTo = new URL('/login?confirmed=1', request.headers.get('origin')).toString();
      const result = await publicClient.auth.resend({
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
      if (publicClient) {
        await publicClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
      }
    }
  };
}

export default createAuthSignupResendHandler();
