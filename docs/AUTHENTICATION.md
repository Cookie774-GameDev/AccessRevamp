# AccessRevamp authentication and email delivery

## Customer ceremony

AccessRevamp uses Supabase email/password accounts, but a password-created session is never admitted directly to customer data.

1. Signup creates an unconfirmed Supabase account and sends the standard confirmation message.
2. The confirmation link proves ownership of the inbox. Its temporary session is signed out and cannot open customer records.
3. Every new sign-in validates the password in a server-only Netlify Function.
4. The temporary password session is revoked and Supabase sends a fresh one-time email link.
5. The email-link session is matched to the pending password challenge and recorded in `accessrevamp_verified_sessions`.
6. Customer APIs and restrictive RLS policies reject any session that did not complete both steps.

There is no phone or SMS authentication flow in the application.

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

## Apply the hosted email branding

Hosted Supabase Auth templates and URL configuration are project-level settings, not database migrations. Apply them from a trusted shell with a Supabase personal access token:

```bash
export SUPABASE_ACCESS_TOKEN='...'
export SUPABASE_PROJECT_REF='vbkkimvedmklebghtkzs'
export SUPABASE_AUTH_SITE_URL='https://www.accessrevamp.com'
export SUPABASE_AUTH_REDIRECT_URLS='https://accessrevamp.com/login,https://www.accessrevamp.com/login'
npm run auth:branding:apply
npm run auth:branding:verify
```

The script:

- keeps email/password authentication enabled;
- requires signup confirmation (`mailer_autoconfirm=false`);
- sets the production Site URL and redirect allow list;
- installs the branded confirmation, sign-in-link, and recovery templates;
- prints only a safe configuration summary and never prints the access token.

## Production email sender

Supabase's built-in SMTP service is only for development and may deliver solely to project-team addresses. A public customer launch requires a custom SMTP provider and a verified sender such as `no-reply@auth.accessrevamp.com`.

When SMTP credentials are available, provide all of these before running the same apply command:

```text
SUPABASE_SMTP_ADMIN_EMAIL
SUPABASE_SMTP_HOST
SUPABASE_SMTP_PORT
SUPABASE_SMTP_USER
SUPABASE_SMTP_PASS
SUPABASE_SMTP_SENDER_NAME=AccessRevamp
```

The script refuses a partial SMTP configuration. Keep credentials in a secret store, configure SPF/DKIM/DMARC with the provider, and disable provider link tracking for Supabase one-time links.

## Operator and customer access

Public signup never grants operator access. Use the existing guarded command after confirming the owner's account:

```bash
OPERATOR_EMAIL=owner@example.com npm run operator:grant
```

Customer workspace: `/account/projects`

Operator workspace: `/operator`

## Verification checklist

- Signup returns no session and displays the confirmation state.
- A confirmation link returns to `/login?confirmed=1`, signs out its temporary session, and asks for the password.
- Wrong passwords produce a generic error and no challenge row. Per-account/IP and per-IP database rate limits apply before password validation.
- Correct passwords generate a short-lived challenge and one-time email link.
- A magic-link session without a matching password challenge receives HTTP 403 from customer APIs.
- A completed challenge can be used once and then appears in `accessrevamp_verified_sessions`.
- Sign-out removes the underlying `auth.sessions` row, cascading the verification record.
- Supabase Security Advisor has no new findings.
- Netlify production build, tests, dependency audit, and deploy preview all pass.
