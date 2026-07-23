import { createHash, createHmac, randomBytes } from 'node:crypto';
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
import {
  createSupabaseAccessTokenClient,
  createSupabasePublicClient,
} from './_shared/supabase-public.mjs';

const CHALLENGE_LIFETIME_MS = 10 * 60 * 1000;
const CHALLENGE_COOKIE = 'accessrevamp_login_challenge';
const CHALLENGE_COOKIE_PATH = '/api/auth-login-complete';
const CHALLENGE_PATTERN = /^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{32,128})$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeCredentials(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(422, 'Sign-in details are invalid.');
  }
  const keys = Object.keys(payload);
  if (keys.some((key) => !['email', 'password'].includes(key))) {
    throw new HttpError(422, 'Sign-in details are invalid.');
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  if (!EMAIL_PATTERN.test(email) || email.length > 254 || password.length < 1 || password.length > 1024) {
    throw new HttpError(422, 'Enter a valid email address and password.');
  }
  return { email, password };
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function challengeHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function challengeCookie(request, token, maximumAgeSeconds) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${CHALLENGE_COOKIE}=${encodeURIComponent(token)}; Path=${CHALLENGE_COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=${maximumAgeSeconds}${secure}`;
}

function requestRateKey(secret, scope, value) {
  return createHmac('sha256', secret).update(`${scope}:${value}`).digest('hex');
}

async function consumeAuthAttempt(admin, request, email, env = process.env) {
  const secret = String(env.AUTH_RATE_LIMIT_SECRET || env.CONTACT_RATE_LIMIT_SECRET || '');
  if (secret.length < 24) throw new HttpError(503, 'Sign-in protection is unavailable.');
  const ip = requestIp(request);
  const result = await admin.rpc('consume_accessrevamp_auth_attempt', {
    p_ip_key: requestRateKey(secret, 'auth-ip', ip),
    p_account_key: requestRateKey(secret, 'auth-account', `${ip}:${email}`),
  });
  if (result.error) {
    if (/rate limit/i.test(result.error.message || '')) {
      throw new HttpError(429, 'Too many sign-in attempts. Try again later.');
    }
    throw new HttpError(503, 'Sign-in protection is unavailable.');
  }
}

function challengeError(error) {
  const message = String(error?.message || '');
  if (/too many|rate limit/i.test(message)) {
    return new HttpError(429, 'Too many sign-in attempts. Try again later.');
  }
  return new HttpError(503, 'Sign-in verification is temporarily unavailable.');
}

async function createLegacyChallenge(admin, user, email, {
  now,
  createToken,
}) {
  const currentTime = now();
  const challengeToken = createToken();
  const hashedToken = challengeHash(challengeToken);
  const expiresAt = new Date(currentTime + CHALLENGE_LIFETIME_MS).toISOString();

  await admin
    .from('accessrevamp_login_challenges')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lte('expires_at', new Date(currentTime).toISOString());
  await admin
    .from('accessrevamp_login_challenges')
    .delete()
    .neq('status', 'pending')
    .lt('created_at', new Date(currentTime - 30 * 24 * 60 * 60 * 1000).toISOString());

  const challengeResult = await admin
    .from('accessrevamp_login_challenges')
    .insert({
      challenge_hash: hashedToken,
      user_id: user.id,
      email,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single();
  if (challengeResult.error || !challengeResult.data?.id) {
    throw new HttpError(503, 'Sign-in verification is unavailable.');
  }

  return { challengeToken, challengeId: challengeResult.data.id };
}

export function createAuthLoginStartHandler({
  getAdmin,
  createPublicClient = createSupabasePublicClient,
  createAccessTokenClient = createSupabaseAccessTokenClient,
  now = () => Date.now(),
  createToken = () => randomBytes(32).toString('base64url'),
} = {}) {
  return async function authLoginStart(request) {
    let admin;
    let challengeId;
    let passwordClient;
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);
      const credentials = normalizeCredentials(await readJsonBody(request));

      if (getAdmin) {
        admin = getAdmin();
        await consumeAuthAttempt(admin, request, credentials.email);
      }

      passwordClient = createPublicClient();
      const passwordResult = await passwordClient.auth.signInWithPassword(credentials);
      if (passwordResult.error || !passwordResult.data?.user || !passwordResult.data?.session?.access_token) {
        throw new HttpError(401, 'Email or password is incorrect.');
      }

      const user = passwordResult.data.user;
      const authenticatedEmail = String(user.email || '').trim().toLowerCase();
      if (!user.email_confirmed_at) {
        throw new HttpError(403, 'Confirm your email address before signing in.');
      }
      if (!authenticatedEmail || authenticatedEmail !== credentials.email) {
        throw new HttpError(401, 'Email or password is incorrect.');
      }

      let challengeToken;
      if (admin) {
        const legacy = await createLegacyChallenge(admin, user, authenticatedEmail, { now, createToken });
        challengeToken = legacy.challengeToken;
        challengeId = legacy.challengeId;
      } else {
        const challengeClient = createAccessTokenClient(passwordResult.data.session.access_token);
        const challengeResult = await challengeClient.rpc('begin_accessrevamp_email_signin');
        challengeToken = String(challengeResult.data || '');
        if (challengeResult.error || !CHALLENGE_PATTERN.test(challengeToken)) {
          throw challengeError(challengeResult.error);
        }
      }

      // The password-created session is never returned to the browser. Revoke it
      // before requesting the fresh inbox verification so both checks stay required.
      await passwordClient.auth.signOut({ scope: 'local' }).catch(() => undefined);

      const verificationUrl = new URL('/login', request.headers.get('origin'));
      verificationUrl.searchParams.set('verification', challengeToken);
      const emailClient = createPublicClient();
      const emailResult = await emailClient.auth.signInWithOtp({
        email: authenticatedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: verificationUrl.toString(),
        },
      });
      if (emailResult.error) {
        if (Number(emailResult.error.status || 0) === 429) {
          throw new HttpError(429, 'Please wait before requesting another verification email.');
        }
        throw new HttpError(503, 'The verification email could not be sent. Try again shortly.');
      }

      if (admin && challengeId) {
        await admin
          .from('accessrevamp_login_challenges')
          .update({ status: 'canceled' })
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .neq('id', challengeId);
      }

      return json({
        ok: true,
        emailHint: maskEmail(authenticatedEmail),
        expiresIn: CHALLENGE_LIFETIME_MS / 1000,
      }, 202, {
        'set-cookie': challengeCookie(request, challengeToken, CHALLENGE_LIFETIME_MS / 1000),
      });
    } catch (error) {
      if (admin && challengeId) {
        await admin
          .from('accessrevamp_login_challenges')
          .update({ status: 'canceled' })
          .eq('id', challengeId)
          .eq('status', 'pending');
      }
      return handleError(error);
    } finally {
      if (passwordClient) {
        await passwordClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
      }
    }
  };
}

export default createAuthLoginStartHandler();
