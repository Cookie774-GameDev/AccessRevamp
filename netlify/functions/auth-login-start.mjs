import {
  assertJsonSize,
  assertMethod,
  assertSameOrigin,
  handleError,
  HttpError,
  json,
  readJsonBody,
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

function challengeCookie(request, token, maximumAgeSeconds) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${CHALLENGE_COOKIE}=${encodeURIComponent(token)}; Path=${CHALLENGE_COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=${maximumAgeSeconds}${secure}`;
}

function challengeError(error) {
  const message = String(error?.message || '');
  if (/too many|rate limit/i.test(message)) {
    return new HttpError(429, 'Too many sign-in attempts. Try again later.');
  }
  return new HttpError(503, 'Sign-in verification is temporarily unavailable.');
}

export function createAuthLoginStartHandler({
  createPublicClient = createSupabasePublicClient,
  createAccessTokenClient = createSupabaseAccessTokenClient,
} = {}) {
  return async function authLoginStart(request) {
    let passwordClient;
    try {
      assertMethod(request, 'POST');
      assertSameOrigin(request);
      assertJsonSize(request);
      const credentials = normalizeCredentials(await readJsonBody(request));

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

      const challengeClient = createAccessTokenClient(passwordResult.data.session.access_token);
      const challengeResult = await challengeClient.rpc('begin_accessrevamp_email_signin');
      const challengeToken = String(challengeResult.data || '');
      if (challengeResult.error || !CHALLENGE_PATTERN.test(challengeToken)) {
        throw challengeError(challengeResult.error);
      }

      // The password session is never returned to the browser. Revoke it before
      // requesting the fresh inbox verification so both checks remain required.
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

      return json({
        ok: true,
        emailHint: maskEmail(authenticatedEmail),
        expiresIn: CHALLENGE_LIFETIME_MS / 1000,
      }, 202, {
        'set-cookie': challengeCookie(request, challengeToken, CHALLENGE_LIFETIME_MS / 1000),
      });
    } catch (error) {
      return handleError(error);
    } finally {
      if (passwordClient) {
        await passwordClient.auth.signOut({ scope: 'local' }).catch(() => undefined);
      }
    }
  };
}

export default createAuthLoginStartHandler();
