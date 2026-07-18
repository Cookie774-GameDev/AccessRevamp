import { brandLink } from '../components/brand.js';
import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';

export function authPage(mode) {
  const signup = mode === 'signup';
  return shell(`<section class="auth-section"><div class="auth-card">${brandLink({ className: 'auth-brand' })}<span class="eyebrow">Customer workspace</span><h1>${signup ? 'Create your account' : 'Welcome back'}</h1><p>${signup ? 'Use the email connected to your project or purchase. Email confirmation may be required.' : 'Sign in to view orders and project progress protected by Supabase row-level security.'}</p><form data-auth-form data-mode="${mode}" novalidate>${signup ? '<label>Full name<input name="fullName" autocomplete="name" maxlength="120" required /></label>' : ''}<label>Email<input type="email" name="email" autocomplete="email" required /></label><label>Password<input type="password" name="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="10" required /></label><button class="button button--full" type="submit">${signup ? 'Create account' : 'Sign in'}</button><p class="form-status" role="status" aria-live="polite"></p></form><p class="auth-switch">${signup ? 'Already have an account? <a href="/login" data-nav>Sign in</a>' : 'Need an account? <a href="/signup" data-nav>Create one</a>'}</p><div class="auth-security">${icon('shield')}<span>Supabase handles authentication. AccessRevamp does not store your password in its application tables.</span></div></div></section>`, { pathname: `/${mode}` });
}
