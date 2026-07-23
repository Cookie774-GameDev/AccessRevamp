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
const PASSWORD_RULES = [
  (value) => value.length >= 12,
  (value) => /[a-z]/.test(value),
  (value) => /[A-Z]/.test(value),
  (value) => /[0-9]/.test(value),
  (value) => /[^A-Za-z0-9]/.test(value),
];
const EMAIL_LIFETIME_SECONDS = 10 * 60;

function normalizeSignup(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(422, 'Account details are invalid.');
  }
  const keys = Object.keys(payload);
  if (keys.some((key) => !['fullName', 'email', 'password'].includes(key))) {
    throw new HttpError(422, 'Account details are invalid.');
  }

  const fullName = String(payload.fullName || '').trim().replace(/\s+/g, ' ');
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  if (fullName.length < 1 || fullName.length > 120) {
    throw new HttpError(422, 'Enter your full name.');
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new HttpError(422, 'Enter a valid email address.');
  }
  if (password.length > 1024 || !PASSWORD_RULES.every((validate) => validate(password))) {
    throw new HttpError(422, 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.');
  }
  return { fullName, email, password };
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function requestRateKey(secret, scope, value) {
  return createHmac('sha256', secret).update(`${scope}:${value}`).digest('hex');
}

async function consumeAuthAttempt(admin, request, email, env = process.env) {
  const secret = String(env.AUTH_RATE_LIMIT_SECRET || env.CONTACT_RATE_LIMIT_SECRET || '');
  if (secret.length < 24) throw new HttpError(503, 'Account protection is unavailable.');
  const ip = requestIp(request);
  const result = await admin.rpc('consume_accessrevamp_auth_attempt', {
    p_ip_key: requestRateKey(secret, 'signup-ip', ip),
    p_account_key: requestRateKey(secret, 'signup-account', `${ip}:${email}`),
  });
  if (result.error) {
    if (/rate limit/i.test(result.error.message || '')) {
      throw new HttpError(429, 'Too many account requests. Try again later.');
    }
    throw new HttpError(503, 'Account protection is unavailable.');
  }
}

function confirmationRedirect(request) {
  const url = new URL('/login', request.headers.get('origin'));
  url.searchParams.set('confirmed', '1');
  return url.toString();
}

function emailFailure(error, fallback) {
  const status = Number(error?.status || error?.code || 0);
  if (status === 429) return new HttpError(429, 'Please wait before requesting another email.');
  return new HttpError(503, fallback);
}

export function createAuthSignupStartHandler({
  getAdmin = getSupabaseAdmin,
  createPublicClient = createSupabasePublicClient,
} = {}) {
  return async function authSignupStart(request) {
    let publicClient;
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);
      const signup = normalizeSignup(await readJsonBody(request));
      const admin = getAdmin();
      await consumeAuthAttempt(admin, request, signup.email);

      const stateResult = await admin.rpc('accessrevamp_auth_email_state', { p_email: signup.email });
      if (stateResult.error || !['missing', 'unconfirmed', 'confirmed'].includes(stateResult.data)) {
        throw new HttpError(503, 'Account lookup is unavailable.');
      }

      if (stateResult.data === 'confirmed') {
        return json({
          ok: false,
          code: 'ACCOUNT_EXISTS',
          next: '/login',
          emailHint: maskEmail(signup.email),
        }, 409);
      }

      publicClient = createPublicClient();
      const redirectTo = confirmationRedirect(request);
      if (stateResult.data === 'unconfirmed') {
        const resendResult = await publicClient.auth.resend({
          type: 'signup',
          email: signup.email,
          options: { emailRedirectTo: redirectTo },
        });
        if (resendResult.error) {
          throw emailFailure(resendResult.error, 'The confirmation email could not be sent. Try again shortly.');
        }
        return json({
          ok: true,
          emailHint: maskEmail(signup.email),
          delivery: 'confirmation',
          expiresIn: EMAIL_LIFETIME_SECONDS,
        }, 202);
      }

      const result = await publicClient.auth.signUp({
        email: signup.email,
        password: signup.password,
        options: {
          emailRedirectTo: redirectTo,
          data: { full_name: signup.fullName },
        },
      });
      if (result.error) {
        throw emailFailure(result.error, 'The account could not be created. Try again shortly.');
      }

      const identities = result.data?.user?.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        return json({
          ok: false,
          code: 'ACCOUNT_EXISTS',
          next: '/login',
          emailHint: maskEmail(signup.email),
        }, 409);
      }
      if (result.data?.session) {
        await publicClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
        throw new HttpError(503, 'Email confirmation is not enforced by the account service. Account access was blocked for safety.');
      }

      return json({
        ok: true,
        emailHint: maskEmail(signup.email),
        delivery: 'confirmation',
        expiresIn: EMAIL_LIFETIME_SECONDS,
      }, 202);
    } catch (error) {
      return handleError(error);
    } finally {
      if (publicClient) {
        await publicClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
      }
    }
  };
}

export default createAuthSignupStartHandler();
