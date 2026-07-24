import { getSupabase } from '../lib/supabase.js';

const RECOVERY_STORAGE_KEY = 'accessrevamp.auth.recovery.v1';
const OTP_PATTERN = /^[0-9]{6}$/;
const PASSWORD_RULES = Object.freeze({
  length: (value) => value.length >= 12,
  mix: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value),
  symbol: (value) => /[^A-Za-z0-9]/.test(value),
});

function setStatus(host, message, tone = '') {
  if (!host) return;
  host.textContent = message;
  if (tone) host.dataset.tone = tone;
  else delete host.dataset.tone;
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

function saveRecovery(value) {
  try { sessionStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(value)); } catch { /* in-memory flow continues */ }
}

function clearRecovery() {
  try { sessionStorage.removeItem(RECOVERY_STORAGE_KEY); } catch { /* no-op */ }
}

function readRecovery() {
  try {
    const value = JSON.parse(sessionStorage.getItem(RECOVERY_STORAGE_KEY) || 'null');
    if (!value?.email || Number(value.expiresAt || 0) <= Date.now()) {
      clearRecovery();
      return null;
    }
    return value;
  } catch {
    clearRecovery();
    return null;
  }
}

function cleanRecoveryUrl() {
  const url = new URL(location.href);
  url.searchParams.delete('recovery');
  url.searchParams.delete('code');
  url.hash = '';
  history.replaceState({}, '', `${url.pathname}${url.search}`);
}

async function waitForRecoverySession(supabase, timeoutMs = 10_000) {
  const current = await supabase.auth.getSession();
  if (current.error) throw current.error;
  if (current.data?.session) return current.data.session;

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout;
    const listener = supabase.auth.onAuthStateChange((event, session) => {
      if (session && ['PASSWORD_RECOVERY', 'SIGNED_IN', 'TOKEN_REFRESHED'].includes(event)) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        listener.data.subscription.unsubscribe();
        resolve(session);
      }
    });
    timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      listener.data.subscription.unsubscribe();
      reject(new Error('The recovery email did not create a valid recovery session. Request a new code.'));
    }, timeoutMs);
  });
}

export function setupRecoveryForm(navigate) {
  const page = document.querySelector('[data-recovery-page]');
  const requestForm = page?.querySelector('[data-recovery-request-form]');
  const codeStep = page?.querySelector('[data-recovery-code-step]');
  const codeForm = page?.querySelector('[data-recovery-code-form]');
  const passwordStep = page?.querySelector('[data-recovery-password-step]');
  const passwordForm = page?.querySelector('[data-recovery-password-form]');
  const completing = page?.querySelector('[data-recovery-completing]');
  if (!page || !requestForm || !codeForm || !passwordForm) return undefined;

  const supabase = getSupabase();
  const requestStatus = requestForm.querySelector('[data-recovery-request-status]');
  const codeStatus = codeForm.querySelector('[data-recovery-code-status]');
  const passwordStatus = passwordForm.querySelector('[data-recovery-password-status]');
  const requestSubmit = requestForm.querySelector('button[type="submit"]');
  const codeSubmit = codeForm.querySelector('button[type="submit"]');
  const passwordSubmit = passwordForm.querySelector('button[type="submit"]');
  const requestEmail = requestForm.elements.email;
  const codeInput = codeForm.elements.code;
  const passwordInput = passwordForm.elements.password;
  const confirmPasswordInput = passwordForm.elements.confirmPassword;
  const emailHint = page.querySelector('[data-recovery-email-hint]');
  const resend = page.querySelector('[data-recovery-resend]');
  const restart = page.querySelector('[data-recovery-restart]');
  let recovery = null;
  let disposed = false;
  let busy = false;

  const show = (name) => {
    requestForm.hidden = name !== 'request';
    codeStep.hidden = name !== 'code';
    passwordStep.hidden = name !== 'password';
    completing.hidden = name !== 'completing';
  };

  const setBusy = (button, value, label = '') => {
    busy = value;
    if (!button) return;
    button.disabled = value;
    button.toggleAttribute('aria-busy', value);
    if (label) button.querySelector('span').textContent = label;
  };

  const validatePassword = () => {
    const password = passwordInput.value;
    const valid = Object.values(PASSWORD_RULES).every((rule) => rule(password));
    Object.entries(PASSWORD_RULES).forEach(([key, rule]) => {
      page.querySelector(`[data-recovery-password-rule="${key}"]`)?.classList.toggle('is-valid', rule(password));
    });
    passwordInput.setCustomValidity(valid ? '' : 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.');
    confirmPasswordInput.setCustomValidity(confirmPasswordInput.value === password ? '' : 'Passwords do not match.');
    return valid && confirmPasswordInput.value === password;
  };

  const requestCode = async (email) => {
    const redirectTo = `${location.origin}/recover-account?recovery=link`;
    const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (result.error) {
      if (Number(result.error.status || 0) === 429) throw new Error('Please wait before requesting another recovery email.');
      throw new Error('The recovery email could not be sent. Check the address and try again shortly.');
    }
    recovery = {
      email,
      emailHint: maskEmail(email),
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    saveRecovery(recovery);
    if (emailHint) emailHint.textContent = recovery.emailHint;
    codeForm.reset();
    setStatus(codeStatus, 'Open the newest AccessRevamp recovery email and enter its six-digit code.');
    show('code');
    queueMicrotask(() => codeInput.focus());
  };

  const openPasswordStep = () => {
    clearRecovery();
    recovery = null;
    passwordForm.reset();
    validatePassword();
    setStatus(passwordStatus, 'Choose a new password that you have not used for this account.');
    show('password');
    queueMicrotask(() => passwordInput.focus());
  };

  const handleRecoveryLink = async () => {
    show('completing');
    try {
      const session = await waitForRecoverySession(supabase);
      if (!session?.access_token || !session.user?.email_confirmed_at) {
        throw new Error('The recovery session is invalid or expired.');
      }
      if (disposed) return;
      cleanRecoveryUrl();
      openPasswordStep();
    } catch (error) {
      if (disposed) return;
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      cleanRecoveryUrl();
      show('request');
      setStatus(requestStatus, error.message || 'The recovery email is invalid or expired. Request a new code.', 'error');
      requestEmail.focus();
    }
  };

  const onRequest = async (event) => {
    event.preventDefault();
    if (busy || !supabase || !requestForm.reportValidity()) return;
    const email = String(new FormData(requestForm).get('email') || '').trim().toLowerCase();
    setBusy(requestSubmit, true, 'Sending recovery email…');
    setStatus(requestStatus, 'Requesting a protected recovery email…');
    try {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      await requestCode(email);
    } catch (error) {
      setStatus(requestStatus, error.message || 'Recovery could not be started.', 'error');
    } finally {
      setBusy(requestSubmit, false, 'Send recovery code');
    }
  };

  const onCodeInput = () => {
    const value = normalizeCode(codeInput.value);
    if (codeInput.value !== value) codeInput.value = value;
    codeInput.setCustomValidity(value && !OTP_PATTERN.test(value) ? 'Enter the complete six-digit code.' : '');
  };

  const onCode = async (event) => {
    event.preventDefault();
    if (busy || !supabase || !recovery) return;
    onCodeInput();
    const token = normalizeCode(codeInput.value);
    if (!OTP_PATTERN.test(token)) {
      codeInput.setCustomValidity('Enter the complete six-digit code.');
      codeForm.reportValidity();
      return;
    }
    setBusy(codeSubmit, true, 'Verifying recovery code…');
    setStatus(codeStatus, 'Checking the newest recovery code…');
    try {
      const result = await supabase.auth.verifyOtp({
        email: recovery.email,
        token,
        type: 'recovery',
      });
      if (result.error) throw result.error;
      if (!result.data?.session?.access_token) throw new Error('The recovery code did not create a secure session.');
      if (disposed) return;
      openPasswordStep();
    } catch (error) {
      setStatus(codeStatus, error.message || 'The code is invalid or expired. Use the newest email.', 'error');
      codeInput.focus();
      codeInput.select();
    } finally {
      setBusy(codeSubmit, false, 'Verify recovery code');
    }
  };

  const onPassword = async (event) => {
    event.preventDefault();
    if (busy || !supabase) return;
    validatePassword();
    if (!passwordForm.reportValidity()) return;
    setBusy(passwordSubmit, true, 'Saving new password…');
    setStatus(passwordStatus, 'Encrypting and saving the new password…');
    show('completing');
    try {
      const result = await supabase.auth.updateUser({ password: passwordInput.value });
      if (result.error) throw result.error;
      await supabase.auth.signOut({ scope: 'local' });
      if (disposed) return;
      clearRecovery();
      cleanRecoveryUrl();
      navigate('/login?recovered=1', { replace: true });
    } catch (error) {
      if (disposed) return;
      show('password');
      setStatus(passwordStatus, error.message || 'The password could not be updated. Request a new recovery code.', 'error');
      passwordInput.focus();
    } finally {
      setBusy(passwordSubmit, false, 'Save new password');
    }
  };

  const onResend = async () => {
    if (busy || !supabase || !recovery?.email) return;
    setBusy(codeSubmit, true);
    setStatus(codeStatus, 'Requesting a new recovery code…');
    try {
      await requestCode(recovery.email);
      setStatus(codeStatus, 'A new AccessRevamp recovery email was requested. Use only the newest code.', 'success');
    } catch (error) {
      setStatus(codeStatus, error.message || 'A new code could not be sent yet.', 'error');
    } finally {
      setBusy(codeSubmit, false);
    }
  };

  const onRestart = async () => {
    clearRecovery();
    recovery = null;
    await supabase?.auth.signOut({ scope: 'local' }).catch(() => undefined);
    codeForm.reset();
    passwordForm.reset();
    show('request');
    setStatus(requestStatus, 'Enter the confirmed account email to request a new recovery code.');
    requestEmail.focus();
  };

  requestForm.addEventListener('submit', onRequest);
  codeForm.addEventListener('submit', onCode);
  passwordForm.addEventListener('submit', onPassword);
  codeInput.addEventListener('input', onCodeInput);
  passwordInput.addEventListener('input', validatePassword);
  confirmPasswordInput.addEventListener('input', validatePassword);
  resend?.addEventListener('click', onResend);
  restart?.addEventListener('click', onRestart);
  validatePassword();

  if (!supabase) {
    setStatus(requestStatus, 'Account recovery is temporarily unavailable. Please try again later.', 'error');
    requestSubmit.disabled = true;
  } else {
    const params = new URLSearchParams(location.search);
    const linkRecovery = params.get('recovery') === 'link' || new URLSearchParams(location.hash.replace(/^#/, '')).get('type') === 'recovery';
    if (linkRecovery) {
      handleRecoveryLink();
    } else {
      supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      recovery = readRecovery();
      if (recovery) {
        if (emailHint) emailHint.textContent = recovery.emailHint || maskEmail(recovery.email);
        show('code');
        queueMicrotask(() => codeInput.focus());
      } else {
        show('request');
      }
    }
  }

  return () => {
    disposed = true;
    requestForm.removeEventListener('submit', onRequest);
    codeForm.removeEventListener('submit', onCode);
    passwordForm.removeEventListener('submit', onPassword);
    codeInput.removeEventListener('input', onCodeInput);
    passwordInput.removeEventListener('input', validatePassword);
    confirmPasswordInput.removeEventListener('input', validatePassword);
    resend?.removeEventListener('click', onResend);
    restart?.removeEventListener('click', onRestart);
  };
}
