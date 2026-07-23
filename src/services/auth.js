import { getSupabase } from '../lib/supabase.js';

const SIGNUP_START_ENDPOINT = '/api/auth-signup-start';
const SIGNUP_RESEND_ENDPOINT = '/api/auth-signup-resend';
const LOGIN_START_ENDPOINT = '/api/auth-login-start';
const LOGIN_COMPLETE_ENDPOINT = '/api/auth-login-complete';
const PENDING_STORAGE_KEY = 'accessrevamp.auth.pending-code.v2';
const LOGIN_HINT_KEY = 'accessrevamp.auth.login-email.v1';
const OTP_PATTERN = /^[0-9]{6}$/;
const PASSWORD_RULES = Object.freeze({
  length: (value) => value.length >= 12,
  mix: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value),
  symbol: (value) => /[^A-Za-z0-9]/.test(value),
});

function setStatus(status, message, tone = '') {
  if (!status) return;
  status.textContent = message;
  if (tone) status.dataset.tone = tone;
  else delete status.dataset.tone;
}

function cleanAuthUrl() {
  const clean = new URL(location.href);
  clean.searchParams.delete('verification');
  clean.searchParams.delete('confirmed');
  clean.searchParams.delete('account');
  clean.hash = '';
  history.replaceState({}, '', `${clean.pathname}${clean.search}`);
}

function maskEmail(email) {
  const [local = '', domain = ''] = String(email || '').split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function normalizeCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

function savePending(flow) {
  try {
    sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(flow));
  } catch {
    // The ceremony still works in memory when storage is unavailable.
  }
}

function removePending() {
  try { sessionStorage.removeItem(PENDING_STORAGE_KEY); } catch { /* no-op */ }
}

function restorePending(mode) {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_STORAGE_KEY) || 'null');
    if (!value || value.mode !== mode || Number(value.expiresAt || 0) <= Date.now()) {
      removePending();
      return null;
    }
    if (!value.email || !['signup', 'login'].includes(value.kind)) return null;
    return value;
  } catch {
    removePending();
    return null;
  }
}

function saveLoginHint(email) {
  try { sessionStorage.setItem(LOGIN_HINT_KEY, email); } catch { /* no-op */ }
}

function takeLoginHint() {
  try {
    const email = sessionStorage.getItem(LOGIN_HINT_KEY) || '';
    sessionStorage.removeItem(LOGIN_HINT_KEY);
    return email;
  } catch {
    return '';
  }
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
    timeout = setTimeout(() => finish(reject, new Error('The verification email did not create a valid session.')), timeoutMs);
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
  const codeStep = page.querySelector('[data-auth-code-step]');
  const codeForm = page.querySelector('[data-auth-code-form]');
  const codeInput = codeForm?.elements.code;
  const codeSubmit = codeForm?.querySelector('button[type="submit"]');
  const codeSubmitLabel = codeSubmit?.querySelector('span');
  const codeStatus = codeForm?.querySelector('[data-auth-code-status]');
  const completingStep = page.querySelector('[data-auth-completing]');
  const emailHint = page.querySelector('[data-auth-email-hint]');
  const codeKicker = page.querySelector('[data-auth-code-kicker]');
  const restart = page.querySelector('[data-auth-restart]');
  const resend = page.querySelector('[data-auth-resend]');
  const mode = form.dataset.mode;
  const signup = mode === 'signup';
  const supabase = getSupabase();
  let disposed = false;
  let busy = false;
  let codeBusy = false;
  let pending = null;

  const show = (panel) => {
    form.hidden = panel !== 'form';
    if (codeStep) codeStep.hidden = panel !== 'code';
    if (completingStep) completingStep.hidden = panel !== 'completing';
  };

  const setBusy = (next, label = null) => {
    busy = next;
    submit.disabled = next;
    submit.toggleAttribute('aria-busy', next);
    if (label && submitLabel) submitLabel.textContent = label;
  };

  const setCodeBusy = (next, label = null) => {
    codeBusy = next;
    if (codeSubmit) {
      codeSubmit.disabled = next;
      codeSubmit.toggleAttribute('aria-busy', next);
    }
    if (label && codeSubmitLabel) codeSubmitLabel.textContent = label;
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

  const startSignup = async (fullName, email, password) => {
    const response = await fetch(SIGNUP_START_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fullName, email, password }),
    });
    if (response.status === 404) return { legacyFallback: true };
    const result = await readJson(response);
    if (response.status === 409 && result.code === 'ACCOUNT_EXISTS') {
      return { accountExists: true, emailHint: result.emailHint };
    }
    if (!response.ok) throw new Error(result.error || 'The account could not be created.');
    return result;
  };

  const fallbackSignup = async (fullName, email, password) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/login?confirmed=1`,
        data: { full_name: fullName },
      },
    });
    if (result.error) throw result.error;
    const identities = result.data?.user?.identities;
    if (Array.isArray(identities) && identities.length === 0) {
      return { accountExists: true, emailHint: maskEmail(email) };
    }
    if (result.data?.session) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      throw new Error('Email confirmation is not enforced by the account service. Account access was blocked for safety.');
    }
    return { ok: true, emailHint: maskEmail(email), expiresIn: 600 };
  };

  const resendSignup = async (email) => {
    const response = await fetch(SIGNUP_RESEND_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (response.status === 404) {
      const result = await supabase.auth.resend({ type: 'signup', email });
      if (result.error) throw result.error;
      return { ok: true, expiresIn: 600 };
    }
    const result = await readJson(response);
    if (response.status === 409) return result;
    if (!response.ok) throw new Error(result.error || 'A new email could not be sent yet.');
    return result;
  };

  const startLogin = async (email, password) => {
    const response = await fetch(LOGIN_START_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const result = await readJson(response);
    if (!response.ok) throw new Error(result.error || 'Secure sign-in could not be started.');
    return result;
  };

  const completeLogin = async (session, legacyChallengeToken = '') => {
    const body = legacyChallengeToken ? { challengeToken: legacyChallengeToken } : {};
    const response = await fetch(LOGIN_COMPLETE_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const result = await readJson(response);
    if (!response.ok) throw new Error(result.error || 'Email verification could not be completed.');
    return result;
  };

  const beginCodeFlow = (flow) => {
    pending = flow;
    savePending(flow);
    if (emailHint) emailHint.textContent = flow.emailHint || maskEmail(flow.email);
    if (codeKicker) codeKicker.textContent = flow.kind === 'signup' ? 'Verification email sent' : 'Password accepted';
    if (resend) resend.hidden = flow.kind !== 'signup';
    codeForm?.reset();
    setStatus(codeStatus, 'Open the newest AccessRevamp email. Enter the six-digit code if shown, or use its secure verification button.');
    show('code');
    queueMicrotask(() => codeInput?.focus());
  };

  const routeExistingAccount = (email) => {
    removePending();
    saveLoginHint(email);
    navigate('/login?account=existing', { replace: true });
  };

  const handleLegacyEmailLink = async (challengeToken) => {
    show('completing');
    try {
      const session = await waitForSession(supabase);
      if (!session.user?.email_confirmed_at) throw new Error('Confirm your email before signing in.');
      await completeLogin(session, challengeToken);
      if (disposed) return;
      removePending();
      cleanAuthUrl();
      navigate('/account/projects', { replace: true });
    } catch (error) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      if (disposed) return;
      cleanAuthUrl();
      show('form');
      setStatus(status, error.message || 'The verification email is invalid or expired. Start again.', 'error');
      passwordInput?.focus();
    }
  };

  const handleLegacySignupConfirmation = async () => {
    show('completing');
    try {
      const session = await waitForSession(supabase);
      if (!session.user?.email_confirmed_at) throw new Error('Email confirmation was not completed.');
      await supabase.auth.signOut({ scope: 'local' });
      if (disposed) return;
      cleanAuthUrl();
      show('form');
      setStatus(status, 'Email confirmed. Sign in with your password to receive a fresh verification email.', 'success');
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
    setStatus(status, signup ? 'Creating the account and requesting your verification email…' : 'Validating your password securely…');

    try {
      if (signup) {
        const fullName = String(data.get('fullName') || '').trim();
        let result = await startSignup(fullName, email, password);
        if (result.legacyFallback) result = await fallbackSignup(fullName, email, password);
        if (result.accountExists) {
          routeExistingAccount(email);
          return;
        }

        passwordInput.value = '';
        confirmPasswordInput.value = '';
        updatePasswordRules();
        beginCodeFlow({
          mode,
          kind: 'signup',
          email,
          emailHint: result.emailHint || maskEmail(email),
          expiresAt: Date.now() + (Number(result.expiresIn || 600) * 1000),
        });
        return;
      }

      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      const result = await startLogin(email, password);
      passwordInput.value = '';
      beginCodeFlow({
        mode,
        kind: 'login',
        email,
        emailHint: result.emailHint || maskEmail(email),
        expiresAt: Date.now() + (Number(result.expiresIn || 600) * 1000),
      });
    } catch (error) {
      setStatus(status, error.message || 'Authentication failed.', 'error');
    } finally {
      setBusy(false, signup ? 'Create account & send email' : 'Check password & send email');
    }
  };

  const onCodeInput = () => {
    const normalized = normalizeCode(codeInput?.value);
    if (codeInput && codeInput.value !== normalized) codeInput.value = normalized;
    codeInput?.setCustomValidity(normalized && !OTP_PATTERN.test(normalized) ? 'Enter the complete six-digit code.' : '');
  };

  const onCodeSubmit = async (event) => {
    event.preventDefault();
    if (codeBusy || !pending || !supabase || !codeInput) return;
    onCodeInput();
    const code = normalizeCode(codeInput.value);
    if (!OTP_PATTERN.test(code)) {
      codeInput.setCustomValidity('Enter the complete six-digit code.');
      codeForm.reportValidity();
      return;
    }

    setCodeBusy(true, pending.kind === 'signup' ? 'Confirming email…' : 'Verifying code…');
    setStatus(codeStatus, 'Checking the newest code securely…');

    try {
      const result = await supabase.auth.verifyOtp({
        email: pending.email,
        token: code,
        type: 'email',
      });
      if (result.error) throw result.error;
      const session = result.data?.session;
      if (!session?.access_token || !session.user?.email_confirmed_at) {
        throw new Error('The code did not create a confirmed session.');
      }

      show('completing');
      if (pending.kind === 'signup') {
        await supabase.auth.signOut({ scope: 'local' });
        removePending();
        pending = null;
        if (disposed) return;
        navigate('/login?confirmed=code', { replace: true });
        return;
      }

      await completeLogin(session);
      removePending();
      pending = null;
      if (disposed) return;
      navigate('/account/projects', { replace: true });
    } catch (error) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      if (disposed) return;
      show('code');
      setStatus(codeStatus, error.message || 'The code is invalid or expired. Use the newest email or start again.', 'error');
      codeInput.focus();
      codeInput.select();
    } finally {
      setCodeBusy(false, signup ? 'Confirm email address' : 'Verify code & enter workspace');
    }
  };

  const onResend = async () => {
    if (!pending || pending.kind !== 'signup' || codeBusy || !supabase) return;
    setCodeBusy(true);
    setStatus(codeStatus, 'Requesting a new verification email…');
    try {
      const result = await resendSignup(pending.email);
      if (result.code === 'ACCOUNT_EXISTS') {
        routeExistingAccount(pending.email);
        return;
      }
      if (result.code === 'RESTART_SIGNUP') {
        removePending();
        pending = null;
        show('form');
        setStatus(status, 'This pending signup was not found. Enter the account details again.', 'error');
        return;
      }
      pending.expiresAt = Date.now() + (Number(result.expiresIn || 600) * 1000);
      savePending(pending);
      codeForm?.reset();
      setStatus(codeStatus, 'A new AccessRevamp email was requested. Check Inbox, Spam, and Promotions, and use only the newest message.', 'success');
      codeInput?.focus();
    } catch (error) {
      setStatus(codeStatus, error.message || 'A new email could not be sent yet. Try again shortly.', 'error');
    } finally {
      setCodeBusy(false);
    }
  };

  const onRestart = async () => {
    removePending();
    pending = null;
    await supabase?.auth.signOut({ scope: 'local' }).catch(() => undefined);
    codeForm?.reset();
    show('form');
    setStatus(status, signup
      ? 'Enter the account details again to request a new verification email.'
      : 'Enter the password again to request a new verification email.');
    form.elements.email?.focus();
  };

  form.addEventListener('submit', onSubmit);
  codeForm?.addEventListener('submit', onCodeSubmit);
  codeInput?.addEventListener('input', onCodeInput);
  restart?.addEventListener('click', onRestart);
  resend?.addEventListener('click', onResend);
  passwordInput?.addEventListener('input', updatePasswordRules);
  confirmPasswordInput?.addEventListener('input', validateSignupPassword);
  updatePasswordRules();

  if (!supabase) {
    setStatus(status, 'Account access is temporarily unavailable on this deployment. Please try again later.', 'error');
    submit.disabled = true;
  } else {
    const params = new URLSearchParams(location.search);
    const verification = params.get('verification');
    const confirmed = params.get('confirmed');
    const existingAccount = params.get('account') === 'existing';
    if (verification && mode === 'login') {
      handleLegacyEmailLink(verification);
    } else if (confirmed === '1' && mode === 'login') {
      handleLegacySignupConfirmation();
    } else if (confirmed === 'code' && mode === 'login') {
      cleanAuthUrl();
      supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      setStatus(status, 'Email confirmed. Enter your password and we will send a fresh sign-in email.', 'success');
      form.elements.email?.focus();
    } else if (existingAccount && mode === 'login') {
      cleanAuthUrl();
      supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      const hintedEmail = takeLoginHint();
      if (hintedEmail && form.elements.email) form.elements.email.value = hintedEmail;
      setStatus(status, 'This email already has an AccessRevamp account. Enter the correct password to receive the sign-in email.', 'success');
      passwordInput?.focus();
    } else {
      supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      const restored = restorePending(mode);
      if (restored) beginCodeFlow(restored);
    }
  }

  return () => {
    disposed = true;
    form.removeEventListener('submit', onSubmit);
    codeForm?.removeEventListener('submit', onCodeSubmit);
    codeInput?.removeEventListener('input', onCodeInput);
    restart?.removeEventListener('click', onRestart);
    resend?.removeEventListener('click', onResend);
    passwordInput?.removeEventListener('input', updatePasswordRules);
    confirmPasswordInput?.removeEventListener('input', validateSignupPassword);
  };
}
