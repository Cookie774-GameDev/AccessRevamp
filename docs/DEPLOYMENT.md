# Deployment runbook

## 1. Preflight

- \`npm ci\`
- \`npm run check\`
- \`npm audit --audit-level=high\`
- Confirm only the two approved one-time catalog entries appear.
- Confirm the displayed contact identity and legal pages are accurate.

## 2. Supabase

Apply the migration only after the connector or CLI clearly identifies the dedicated AccessRevamp project. Then run security and performance advisors. Configure Auth URLs for localhost, deploy previews, and the production Netlify address. Use the publishable key in the browser and the service-role key only in Netlify functions.

## 3. Stripe

Use sandbox mode through end-to-end testing. Add the Netlify webhook endpoint and verify signature handling plus duplicate event delivery. Move to live mode by creating or confirming the two live one-time prices, replacing only deployment variables, and testing a real low-risk transaction according to Stripe's launch process.

## 4. Netlify

Import the repository, add variables from \`.env.example\`, and deploy. The configuration supplies the build command, publish directory, function directory, SPA fallback, cache policy, and security headers.

## 5. Acceptance checks

- Keyboard-only navigation through every route
- Mobile layout at narrow widths
- Contact success, validation, honeypot, rate limit, and failure states
- Signup, confirmation, login, logout, RLS, and dashboard empty states
- Stripe test checkout and webhook replay
- Opt-out link, suppression insert, and cancellation of unsent queue items
- Daily outreach guard at item 21
- No secrets or real customer data in logs, source maps, screenshots, or Git history
