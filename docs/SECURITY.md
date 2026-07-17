# Security model

## Public review boundary

The review process is passive and limited to ordinary public-page retrieval. It excludes:

- login, signup, account, admin, cart, checkout, and private routes;
- form submission, state-changing requests, WebSockets, popups, and file uploads;
- credentials, customer records, access tokens, and private documents;
- private, loopback, link-local, and cloud metadata IP ranges;
- vulnerability exploitation, stress testing, and bypass attempts.

## Application controls

- Supabase Row Level Security on customer-facing tables
- Service-role key restricted to server functions
- Same-origin enforcement for browser writes
- Strict schemas and body-size limits
- HMAC-derived contact rate keys rather than raw IP storage
- Stripe signature verification and event idempotency
- Exact amount/plan validation before an order is recorded
- Permanent outreach suppression and one-click opt-out
- Security headers and restrictive Content Security Policy
- No secret values in the repository

## Reporting

Use the contact form with the affected URL and a concise reproduction. Do not include secrets or personal data. A real security contact email should be added before public launch.
