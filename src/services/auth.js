import { getSupabase } from '../lib/supabase.js';

const LOGIN_START_ENDPOINT = '/api/auth-login-start';
const LOGIN_COMPLETE_ENDPOINT = '/api/auth-login-complete';
const PASSWORD_RULES = Object.freeze({
  length: (value) => value.length >= 12,
  mix: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value),
  symbol: (value) => /[^A-Za-z0-9]/.test(value),
});

function setStatus(status, message, tone = '') {
  status.textContent = message;
  if (tone) status.dataset.tone = tone;
  else delete status.dataset.tone;
}

function cleanAuthUrl() {
  const clean = new URL(location.href);
  clean.searchParams.delete('verification');
  clean.searchParams.delete('confirmed');
  clean.hash = '';
  history.replaceState({}, '', `${clean.pathname}${clean.search}`);
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

async function waitForSession(supabase, timeoutMs = 9000) {
  const current = await supabase.auth.getSession();
  if (current.error) throw current.error;
  if (current.data?.session) return current.data.session;

  return new Promise((resolve, reject) => {
    let settled = false;
    let subscription;
    let timeout;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      subscription?.unsubscribe();
      callback(value);
    };
    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(resolve, session);
    });
    subscription = listener.data.subscription;
    timeout = setTimeout(() => finish(reject, new Error('The email link did not create a valid session.')), timeoutMs);
  });
}

export function setupAuthForm(navigate) {
  const page = document.querySelector('[data-auth-page]');
  const form = document.querySelector('[data-auth-form]');
  if (!page || !form) return undefined;

  const status = form.querySelector('[data-auth-status]');
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit?.querySelector('span');
  const passwordInput = form.elements.password;
  const confirmPasswordInput = form.elements.confirmPassword;
  const emailStep = page.querySelector('[data-auth-email-step]');
  const completingStep = page.querySelector('[data-auth-completing]');
  const emailHint = page.querySelector('[data-auth-email-hint]');
  const restart = page.querySelector('[data-auth-restart]');
  const mode = form.dataset.mode;
  const signup = mode === 'signup';
  const supabase = getSupabase();
  let disposed = false;
  let busy = false;

  const show = (panel) => {
    form.hidden = panel !== 'form';
    if (emailStep) emailStep.hidden = panel !== 'email';
    if (completingStep) completingStep.hidden = panel !== 'completing';
  };

  const setBusy = (next, label = null) => {
    busy = next;
    submit.disabled = next;
    submit.toggleAttribute('aria-busy', next);
    if (label && submitLabel) submitLabel.textContent = label;
  };

  const updatePasswordRules = () => {
    if (!signup || !passwordInput) return;
    const value = passwordInput.value;
    Object.entries(PASSWORD_RULES).forEach(([key, validate]) => {
      page.querySelector(`[data-password-rule="${key}"]`)?.classList.toggle('is-valid', validate(value));
    });
  };

  const validateSignupPassword = () => {
    if (!signup) return true;
    const password = passwordInput.value;
    const valid = Object.values(PASSWORD_RULES).every((validate) => validate(password));
    passwordInput.setCustomValidity(valid ? '' : 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.');
    confirmPasswordInput.setCustomValidity(
      confirmPasswordInput.value === password ? '' : 'Passwords do not match.',
    );
    return valid && confirmPasswordInput.value === password;
  };

  const startLogin = async (email, password) => {
    const response = await fetch(LOGIN_START_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const result = await readJson(response);
    if (!response.ok) throw new Error(result.error || 'Secure sign-in could not be started.');
    return result;
  };

  const completeLogin = async (session, challengeToken) => {
    const response = await fetch(LOGIN_COMPLETE_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ challengeToken }),
    });
    const result = await readJson(response);
    if (!response.ok) throw new Error(result.error || 'Email verification could not be completed.');
    return result;
  };

  const handleEmailLink = async (challengeToken) => {
    show('completing');
    try {
      const session = await waitForSession(supabase);
      if (!session.user?.email_confirmed_at) throw new Error('Confirm your email before signing in.');
      await completeLogin(session, challengeToken);
      if (disposed) return;
      cleanAuthUrl();
      navigate('/account/projects', { replace: true });
    } catch (error) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      if (disposed) return;
      cleanAuthUrl();
      show('form');
      setStatus(status, error.message || 'The verification link is invalid or expired. Start again.', 'error');
      passwordInput?.focus();
    }
  };

  const handleSignupConfirmation = async () => {
    show('completing');
    try {
      const session = await waitForSession(supabase);
      if (!session.user?.email_confirmed_at) throw new Error('Email confirmation was not completed.');
      await supabase.auth.signOut({ scope: 'local' });
      if (disposed) return;
      cleanAuthUrl();
      show('form');
      setStatus(status, 'Email confirmed. Sign in with your password to receive a fresh verification link.', 'success');
      form.elements.email?.focus();
    } catch (error) {
      if (disposed) return;
      cleanAuthUrl();
      show('form');
      setStatus(status, error.message || 'Email confirmation could not be verified.', 'error');
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (busy || !supabase) return;
    if (signup) validateSignupPassword();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const email = String(data.get('email') || '').trim().toLowerCase();
    const password = String(data.get('password') || '');
    setBusy(true, signup ? 'Creating protected account…' : 'Checking password…');
    setStatus(status, signup ? 'Preparing your confirmed customer identity…' : 'Validating your password securely…');

    try {
      if (signup) {
        const fullName = String(data.get('fullName') || '').trim();
        const redirectTo = `${location.origin}/login?confirmed=1`;
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: { full_name: fullName },
          },
        });
        if (result.error) throw result.error;

        if (result.data?.session) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
          throw new Error('Email confirmation is not enforced by the connected Supabase project. Account access was blocked for safety.');
        }

        form.dataset.complete = 'true';
        [...form.elements].forEach((control) => { control.disabled = true; });
        if (submitLabel) submitLabel.textContent = 'Confirmation email sent';
        setStatus(status, 'Check your email to confirm your AccessRevamp account, then return to sign in.', 'success');
        return;
      }

      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      const result = await startLogin(email, password);
      passwordInput.value = '';
      if (emailHint) emailHint.textContent = result.emailHint || email;
      show('email');
    } catch (error) {
      setStatus(status, error.message || 'Authentication failed.', 'error');
    } finally {
      if (!form.dataset.complete) {
        setBusy(false, signup ? 'Create secure account' : 'Check password & send email');
      }
    }
  };

  const onRestart = async () => {
    await supabase?.auth.signOut({ scope: 'local' }).catch(() => undefined);
    show('form');
    setStatus(status, 'Enter the password again to request a new one-time email link.');
    form.elements.email?.focus();
  };

  form.addEventListener('submit', onSubmit);
  restart?.addEventListener('click', onRestart);
  passwordInput?.addEventListener('input', updatePasswordRules);
  confirmPasswordInput?.addEventListener('input', validateSignupPassword);
  updatePasswordRules();

  if (!supabase) {
    setStatus(status, 'Supabase is not connected on this deployment. Account access is unavailable.', 'error');
    submit.disabled = true;
  } else {
    const params = new URLSearchParams(location.search);
    const verification = params.get('verification');
    const confirmed = params.get('confirmed') === '1';
    if (verification && mode === 'login') {
      handleEmailLink(verification);
    } else if (confirmed && mode === 'login') {
      handleSignupConfirmation();
    } else {
      // Visiting an auth form starts a new ceremony rather than silently reusing
      // a prior browser session.
      supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
  }

  return () => {
    disposed = true;
    form.removeEventListener('submit', onSubmit);
    restart?.removeEventListener('click', onRestart);
    passwordInput?.removeEventListener('input', updatePasswordRules);
    confirmPasswordInput?.removeEventListener('input', validateSignupPassword);
  };
}
