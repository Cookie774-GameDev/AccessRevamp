import { brandLink } from '../components/brand.js';
import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';

const protocolStep = (number, title, copy) => `<article class="auth-protocol__step">
  <span>${number}</span>
  <div><strong>${title}</strong><p>${copy}</p></div>
</article>`;

export function authPage(mode) {
  const signup = mode === 'signup';
  const title = signup ? 'Open your private project workspace.' : 'Enter the workroom.';
  const introduction = signup
    ? 'Create the confirmed account that will hold your brief, references, design reviews, progress updates, and final website files.'
    : 'AccessRevamp protects customer work with a password check followed by a fresh verification email for every new sign-in.';

  const signupFields = `<label class="auth-field">
    <span>Full name</span>
    <input name="fullName" autocomplete="name" maxlength="120" placeholder="Your name" required />
  </label>`;

  return shell(`<section class="auth-experience" data-auth-page data-auth-mode="${mode}">
    <div class="auth-experience__grid" aria-hidden="true"></div>
    <div class="auth-orbit auth-orbit--one" aria-hidden="true"></div>
    <div class="auth-orbit auth-orbit--two" aria-hidden="true"></div>

    <div class="container-wide auth-layout">
      <aside class="auth-story" aria-label="AccessRevamp account security">
        ${brandLink({ className: 'auth-brand' })}
        <div class="auth-story__copy">
          <span class="auth-kicker"><i></i> Access / verified</span>
          <h1>${title}</h1>
          <p>${introduction}</p>
        </div>

        <div class="auth-protocol" aria-label="Sign-in protocol">
          ${protocolStep('01', signup ? 'Confirm ownership' : 'Correct password', signup ? 'Supabase sends a confirmation message to the email you register.' : 'Your password is checked first and never sent to AccessRevamp application tables.')}
          ${protocolStep('02', 'Verify the inbox', signup ? 'Open the secure confirmation link before the account can be used.' : 'A new one-time AccessRevamp sign-in link is sent to the confirmed email.')}
          ${protocolStep('03', 'Enter the workspace', 'Only the fully verified session can read customer projects, designs, and downloads.')}
        </div>

        <div class="auth-story__footer">
          ${icon('shield', 'auth-story__shield')}
          <p><strong>Private by default.</strong> Customer files use expiring links. Passwords stay inside Supabase Auth.</p>
        </div>
      </aside>

      <div class="auth-panel-wrap">
        <div class="auth-panel">
          <div class="auth-panel__topline"><span>Customer identity</span><span>${signup ? 'New account' : 'Two-step sign-in'}</span></div>
          <header class="auth-panel__header">
            <span class="eyebrow">Secure customer hub</span>
            <h2>${signup ? 'Create account' : 'Sign in'}</h2>
            <p>${signup ? 'Use the same email connected to your AccessRevamp order or project.' : 'Both the password and inbox verification are required.'}</p>
          </header>

          <form class="auth-form" data-auth-form data-mode="${mode}" novalidate>
            ${signup ? signupFields : ''}
            <label class="auth-field">
              <span>Email address</span>
              <input type="email" name="email" autocomplete="email" inputmode="email" maxlength="254" placeholder="you@business.com" required />
            </label>
            <label class="auth-field">
              <span>Password</span>
              <input type="password" name="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="${signup ? '12' : '1'}" maxlength="1024" placeholder="${signup ? '12+ characters' : 'Your password'}" required />
            </label>
            ${signup ? `<label class="auth-field">
              <span>Confirm password</span>
              <input type="password" name="confirmPassword" autocomplete="new-password" minlength="12" maxlength="1024" placeholder="Repeat your password" required />
            </label>
            <div class="auth-password-rules" data-password-rules aria-label="Password requirements">
              <span data-password-rule="length">${icon('check')} 12 or more characters</span>
              <span data-password-rule="mix">${icon('check')} Uppercase, lowercase, and number</span>
              <span data-password-rule="symbol">${icon('check')} At least one symbol</span>
            </div>` : ''}

            <button class="button auth-submit" type="submit">
              <span>${signup ? 'Create secure account' : 'Check password & send email'}</span>${icon('arrow')}
            </button>
            <p class="auth-status form-status" data-auth-status role="status" aria-live="polite"></p>
          </form>

          <section class="auth-email-step" data-auth-email-step hidden aria-live="polite">
            <div class="auth-email-step__mark">${icon('check')}</div>
            <span class="auth-kicker"><i></i> Password accepted</span>
            <h2>Check your email.</h2>
            <p>We sent a one-time sign-in link to <strong data-auth-email-hint>your confirmed address</strong>. Open it in this browser to finish.</p>
            <div class="auth-email-step__note">The link expires shortly and cannot replace the password step.</div>
            <button class="button button--ghost auth-restart" type="button" data-auth-restart>Use a different account</button>
          </section>

          <section class="auth-email-step" data-auth-completing hidden aria-live="polite">
            <div class="auth-email-step__loader" aria-hidden="true"></div>
            <span class="auth-kicker"><i></i> Verifying session</span>
            <h2>Opening your workspace.</h2>
            <p>AccessRevamp is validating the one-time email link against the password challenge.</p>
          </section>

          <div class="auth-panel__switch">
            <p>${signup ? 'Already registered?' : 'Need a customer account?'}</p>
            <a href="/${signup ? 'login' : 'signup'}" data-nav>${signup ? 'Sign in securely' : 'Create your account'} ${icon('arrow')}</a>
          </div>

          <div class="auth-panel__legal">
            <span>${icon('shield')} Email verification required</span>
            <span>No phone number required</span>
            <span><a href="/privacy" data-nav>Privacy</a> · <a href="/terms" data-nav>Terms</a></span>
          </div>
        </div>
      </div>
    </div>
  </section>`, { pathname: `/${mode}`, pageClass: 'auth-page' });
}
