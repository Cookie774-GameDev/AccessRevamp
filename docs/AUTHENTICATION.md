# AccessRevamp authentication and email delivery

## Customer ceremony

AccessRevamp uses Supabase email/password accounts, but a password-created session is never admitted directly to customer data.

### Signup

1. The customer creates an account with a name, email address, and strong password.
2. Supabase creates an unconfirmed account and sends an official AccessRevamp email containing a six-digit code.
3. The customer copies that code into the code box on `/signup`.
4. `supabase.auth.verifyOtp({ email, token, type: 'email' })` confirms ownership of the inbox.
5. The temporary confirmation session is signed out. Confirmation alone does not open customer records.
6. The customer continues through the separate password-plus-code sign-in ceremony.

### Every new sign-in

1. A server-only Netlify Function checks the correct password after database-backed IP and account rate limits are consumed.
2. The password-created Supabase session is revoked and is never returned to browser JavaScript.
3. A short-lived random challenge is stored only as a SHA-256 hash. Its original value is bound to the browser in an `HttpOnly`, `SameSite=Strict` cookie.
4. Supabase sends a fresh official AccessRevamp email containing a six-digit code.
5. The customer copies the code into `/login`; Supabase verifies the code and creates a confirmed email session.
6. The completion Function matches that session to the password challenge and records the exact session in `accessrevamp_verified_sessions`.
7. Customer APIs and restrictive RLS policies reject any session that did not complete both the password and code steps.

There is no phone or SMS authentication flow. The signup and sign-in templates contain `{{ .Token }}` and deliberately contain no `{{ .ConfirmationURL }}`, so account verification does not depend on clicking an email link or following a redirect.

## Required Netlify environment categories

The existing values remain required:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
AUTH_RATE_LIMIT_SECRET
VITE_SITE_URL
ACCESSREVAMP_SITE_URL
ALLOWED_ORIGINS
```

The publishable key is allowed in browser code. The service-role key is server-only and must never use a `VITE_` prefix. `AUTH_RATE_LIMIT_SECRET` must be at least 24 random characters; `CONTACT_RATE_LIMIT_SECRET` is accepted as a temporary fallback.

## Apply the hosted email templates and production URL

Hosted Supabase Auth templates and the Auth Site URL are project-level settings, not database migrations. The repository contains a guarded Management API script and a GitHub Actions workflow.

### Preferred GitHub workflow

Add the following repository secret under **GitHub → Settings → Secrets and variables → Actions**:

```text
SUPABASE_ACCESS_TOKEN
```

The value must be a Supabase personal access token with access to project `vbkkimvedmklebghtkzs`. Never place it in source code, an issue, a pull request, or a chat message.

Then run **Actions → Supabase Auth Branding → Run workflow**. The same workflow also runs automatically when the templates are merged to `main`. It safely skips rather than leaking data when the secret is absent.

Optional custom SMTP secrets supported by that workflow are:

```text
SUPABASE_SMTP_ADMIN_EMAIL
SUPABASE_SMTP_HOST
SUPABASE_SMTP_PORT
SUPABASE_SMTP_USER
SUPABASE_SMTP_PASS
```

### Trusted-shell alternative

```bash
export SUPABASE_ACCESS_TOKEN='...'
export SUPABASE_PROJECT_REF='vbkkimvedmklebghtkzs'
export SUPABASE_AUTH_SITE_URL='https://accessrevamp.com'
export SUPABASE_AUTH_REDIRECT_URLS='https://accessrevamp.com/login,https://accessrevamp.com/signup,https://www.accessrevamp.com/login,https://www.accessrevamp.com/signup'
npm run auth:branding:apply
npm run auth:branding:verify
```

The script:

- keeps email/password authentication enabled;
- requires signup confirmation (`mailer_autoconfirm=false`);
- sets the hosted Auth Site URL to the production AccessRevamp domain rather than localhost;
- limits email OTP validity to ten minutes;
- installs polished confirmation and sign-in templates that display a six-digit code and no verification link;
- installs the polished recovery template;
- prints only a safe configuration summary and never prints the access token or SMTP password.

## Production email sender

The official HTML, subjects, and sender display name are configured separately from the mail transport. For public deliverability from an AccessRevamp-controlled address, configure a custom SMTP provider and a verified sender such as:

```text
no-reply@auth.accessrevamp.com
```

When SMTP credentials are available, provide all of these before running the same apply command:

```text
SUPABASE_SMTP_ADMIN_EMAIL
SUPABASE_SMTP_HOST
SUPABASE_SMTP_PORT
SUPABASE_SMTP_USER
SUPABASE_SMTP_PASS
SUPABASE_SMTP_SENDER_NAME=AccessRevamp
```

The script refuses a partial SMTP configuration. Keep credentials in a secret store, configure SPF, DKIM, and DMARC with the provider, and disable provider link tracking for recovery links.

## Operator and customer access

Public signup never grants operator access. Use the existing guarded command after confirming the owner's account:

```bash
OPERATOR_EMAIL=owner@example.com npm run operator:grant
```

Customer workspace: `/account/projects`

Operator workspace: `/operator`

## Verification checklist

- Signup returns no session and opens the six-digit confirmation-code panel.
- The signup code confirms the email and then returns the customer to the password sign-in screen.
- Wrong passwords produce a generic error and no challenge row. Per-account/IP and per-IP database rate limits apply before password validation.
- Correct passwords generate a short-lived hashed challenge, set an HttpOnly challenge cookie, and send a six-digit email code.
- The browser stores only non-secret pending-flow metadata; the password challenge is unavailable to JavaScript.
- A Supabase email-code session without the matching password challenge receives HTTP 403 from customer APIs.
- A completed challenge can be used once and then appears in `accessrevamp_verified_sessions`.
- Sign-out removes the underlying `auth.sessions` row, cascading the verification record.
- Confirmation and sign-in templates contain `{{ .Token }}` and no `{{ .ConfirmationURL }}`.
- Hosted Auth reports `https://accessrevamp.com` as its Site URL and does not report localhost.
- Supabase Security Advisor has no new findings.
- Netlify production build, tests, dependency audit, deploy preview, and desktop/mobile code-panel stress tests all pass.
