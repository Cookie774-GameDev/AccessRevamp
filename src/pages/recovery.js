import { brandLink } from '../components/brand.js';
import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';

const protocolStep = (number, title, copy) => `<article class="auth-protocol__step">
  <span>${number}</span>
  <div><strong>${title}</strong><p>${copy}</p></div>
</article>`;

const passwordRules = `<div class="auth-password-rules" data-recovery-password-rules aria-label="Password requirements">
  <span data-recovery-password-rule="length">${icon('check')} 12 or more characters</span>
  <span data-recovery-password-rule="mix">${icon('check')} Uppercase, lowercase, and number</span>
  <span data-recovery-password-rule="symbol">${icon('check')} At least one symbol</span>
</div>`;

export function recoveryPage(pathname = '/forgot-password') {
  return shell(`<section class="auth-experience" data-recovery-page>
    <div class="auth-experience__grid" aria-hidden="true"></div>
    <div class="auth-orbit auth-orbit--one" aria-hidden="true"></div>
    <div class="auth-orbit auth-orbit--two" aria-hidden="true"></div>

    <div class="container-wide auth-layout">
      <aside class="auth-story" aria-label="AccessRevamp account recovery">
        ${brandLink({ className: 'auth-brand' })}
        <div class="auth-story__copy">
          <span class="auth-kicker"><i></i> Recover / verified</span>
          <h1>Recover your account securely.</h1>
          <p>Use your confirmed email, enter the newest six-digit recovery code, and choose a new password without sharing private account information.</p>
        </div>

        <div class="auth-protocol" aria-label="Account recovery protocol">
          ${protocolStep('01', 'Request the code', 'Enter the confirmed email attached to the AccessRevamp account.')}
          ${protocolStep('02', 'Verify the inbox', 'Copy the six-digit code from the newest AccessRevamp recovery email.')}
          ${protocolStep('03', 'Choose a new password', 'Set a strong password, close the recovery session, and return to secure sign-in.')}
        </div>

        <div class="auth-story__footer">
          ${icon('shield', 'auth-story__shield')}
          <p><strong>One-time recovery.</strong> Codes expire shortly and can be used only once. AccessRevamp support will never ask for your password or recovery code.</p>
        </div>
      </aside>

      <div class="auth-panel-wrap">
        <div class="auth-panel">
          <div class="auth-panel__topline"><span>Customer identity</span><span>Account recovery</span></div>
          <header class="auth-panel__header">
            <span class="eyebrow">Secure customer hub</span>
            <h2>Reset password</h2>
            <p>Start with the confirmed email used for your AccessRevamp account.</p>
          </header>

          <form class="auth-form" data-recovery-request-form novalidate>
            <label class="auth-field">
              <span>Email address</span>
              <input type="email" name="email" autocomplete="email" inputmode="email" maxlength="254" placeholder="you@business.com" required />
            </label>
            <button class="button auth-submit" type="submit"><span>Send recovery code</span>${icon('arrow')}</button>
            <p class="auth-status form-status" data-recovery-request-status role="status" aria-live="polite"></p>
          </form>

          <section class="auth-code-step" data-recovery-code-step hidden aria-live="polite">
            <div class="auth-email-step__mark">${icon('check')}</div>
            <span class="auth-kicker"><i></i> Recovery email sent</span>
            <h2>Enter your 6-digit code.</h2>
            <p>Use the newest AccessRevamp recovery email sent to <strong data-recovery-email-hint>your email address</strong>.</p>
            <form class="auth-code-form" data-recovery-code-form novalidate>
              <label class="auth-code-field">
                <span>Recovery code</span>
                <input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" placeholder="000000" aria-describedby="recovery-code-help" required />
              </label>
              <p class="auth-code-help" id="recovery-code-help">Six digits · one-time use · expires shortly</p>
              <button class="button auth-submit auth-code-submit" type="submit"><span>Verify recovery code</span>${icon('arrow')}</button>
              <p class="auth-status" data-recovery-code-status role="status" aria-live="polite"></p>
            </form>
            <div class="auth-code-actions">
              <button class="auth-text-button" type="button" data-recovery-resend>Send a new code</button>
              <button class="auth-text-button" type="button" data-recovery-restart>Use a different email</button>
            </div>
            <p class="auth-code-fallback"><strong>Email shows a secure recovery button instead?</strong> Open it. The button returns only to AccessRevamp and continues to the new-password step.</p>
            <div class="auth-email-step__note">Never forward the recovery email or share the code. AccessRevamp support cannot see or recover your password.</div>
          </section>

          <section class="auth-password-step" data-recovery-password-step hidden aria-live="polite">
            <div class="auth-email-step__mark">${icon('shield')}</div>
            <span class="auth-kicker"><i></i> Inbox verified</span>
            <h2>Choose a new password.</h2>
            <p>This replaces the current password for your AccessRevamp account.</p>
            <form class="auth-form auth-password-form" data-recovery-password-form novalidate>
              <label class="auth-field">
                <span>New password</span>
                <input type="password" name="password" autocomplete="new-password" minlength="12" maxlength="1024" placeholder="12+ characters" required />
              </label>
              <label class="auth-field">
                <span>Confirm new password</span>
                <input type="password" name="confirmPassword" autocomplete="new-password" minlength="12" maxlength="1024" placeholder="Repeat your new password" required />
              </label>
              ${passwordRules}
              <button class="button auth-submit" type="submit"><span>Save new password</span>${icon('arrow')}</button>
              <p class="auth-status" data-recovery-password-status role="status" aria-live="polite"></p>
            </form>
          </section>

          <section class="auth-email-step" data-recovery-completing hidden aria-live="polite">
            <div class="auth-email-step__loader" aria-hidden="true"></div>
            <span class="auth-kicker"><i></i> Securing account</span>
            <h2>Updating your password.</h2>
            <p>AccessRevamp is closing the recovery session and preparing secure sign-in.</p>
          </section>

          <div class="auth-panel__switch">
            <p>Remember your password?</p>
            <a href="/login" data-nav>Return to sign in ${icon('arrow')}</a>
          </div>

          <div class="auth-panel__legal">
            <span>${icon('shield')} Email verification required</span>
            <span>No phone number required</span>
            <span><a href="/privacy" data-nav>Privacy</a> · <a href="/support" data-nav>Support</a></span>
          </div>
        </div>
      </div>
    </div>
  </section>`, { pathname, pageClass: 'auth-page' });
}
