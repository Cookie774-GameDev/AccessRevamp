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
          ${protocolStep('01', signup ? 'Create the identity' : 'Correct password', signup ? 'Register the email and password that will protect the private customer workspace.' : 'Your password is checked first and is never stored in AccessRevamp project records.')}
          ${protocolStep('02', 'Verify the email', signup ? 'AccessRevamp sends an official confirmation email to the inbox you registered.' : 'A fresh verification email is sent to the already confirmed address.')}
          ${protocolStep('03', 'Enter the workspace', 'Finish verification on AccessRevamp. Only the fully verified session can read customer projects, designs, and downloads.')}
        </div>

        <div class="auth-story__footer">
          ${icon('shield', 'auth-story__shield')}
          <p><strong>Private by default.</strong> Customer files use expiring links. Passwords remain protected by the account service, and verification is one-time use.</p>
        </div>
      </aside>

      <div class="auth-panel-wrap">
        <div class="auth-panel">
          <div class="auth-panel__topline"><span>Customer identity</span><span>${signup ? 'New account' : 'Password + email verification'}</span></div>
          <header class="auth-panel__header">
            <span class="eyebrow">Secure customer hub</span>
            <h2>${signup ? 'Create account' : 'Sign in'}</h2>
            <p>${signup ? 'Use the same email connected to your AccessRevamp order or project.' : 'Both the correct password and the newest verification email are required.'}</p>
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
              <span>${signup ? 'Create account & send email' : 'Check password & send email'}</span>${icon('arrow')}
            </button>
            <p class="auth-status form-status" data-auth-status role="status" aria-live="polite"></p>
          </form>

          <section class="auth-code-step" data-auth-code-step hidden aria-live="polite">
            <div class="auth-email-step__mark">${icon('check')}</div>
            <span class="auth-kicker"><i></i> <span data-auth-code-kicker>${signup ? 'Verification email sent' : 'Password accepted'}</span></span>
            <h2>Finish email verification.</h2>
            <p>We sent an AccessRevamp verification email to <strong data-auth-email-hint>your email address</strong>. Open the newest message. Enter its six-digit code below when one is shown.</p>

            <form class="auth-code-form" data-auth-code-form novalidate>
              <label class="auth-code-field">
                <span>Verification code</span>
                <input
                  type="text"
                  name="code"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  pattern="[0-9]{6}"
                  minlength="6"
                  maxlength="6"
                  placeholder="000000"
                  aria-describedby="auth-code-help"
                  required
                />
              </label>
              <p class="auth-code-help" id="auth-code-help">Six digits · one-time use · expires shortly</p>
              <button class="button auth-submit auth-code-submit" type="submit">
                <span>${signup ? 'Confirm email address' : 'Verify code & enter workspace'}</span>${icon('arrow')}
              </button>
              <p class="auth-status" data-auth-code-status role="status" aria-live="polite"></p>
            </form>

            <div class="auth-code-actions">
              <button class="auth-text-button" type="button" data-auth-resend${signup ? '' : ' hidden'}>Send a new email</button>
              <button class="auth-text-button" type="button" data-auth-restart>${signup ? 'Change account details' : 'Enter password again'}</button>
            </div>
            <p class="auth-code-fallback"><strong>Email shows a secure button instead?</strong> Open that button. It returns to the AccessRevamp website and finishes verification here.</p>
            <div class="auth-email-step__note">AccessRevamp support will never ask for your verification code or password. Do not forward the email or share its secure button.</div>
          </section>

          <section class="auth-email-step" data-auth-completing hidden aria-live="polite">
            <div class="auth-email-step__loader" aria-hidden="true"></div>
            <span class="auth-kicker"><i></i> Verifying email</span>
            <h2>${signup ? 'Confirming your inbox.' : 'Opening your workspace.'}</h2>
            <p>AccessRevamp is validating the one-time verification and securing this browser session.</p>
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
