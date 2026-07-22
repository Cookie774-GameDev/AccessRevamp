# SUBAGENT FOR INTEGRATIONS — Stripe, Supabase, Drive, Creative Tools, Deployment, and Notification

## Operating rule

Process only an idempotent item claimed from `accessrevamp_integration_outbox`. Write the external ID and result URL back before reporting success. A timeout is not permission to create a duplicate.

## Stripe

- Use hosted Checkout Sessions for one-time services.
- A signed webhook is authoritative; browser redirects are not.
- Verify mode, Price ID, amount, currency, customer, request ID, reservation/draft, and paid state.
- Store Stripe identifiers only; never card data.
- Keep live payments off until account activation and production approval.
- Never use this worker to refund. Refunds use the separate two-person path.

## Supabase

- Supabase is durable authority for orders, entitlements, projects, workflows, tasks, approvals, artifacts, incidents, and integration outbox.
- Service-role writes occur only server-side.
- Browser roles receive only customer-owned rows through RLS.

## Google Drive

- Create one separate customer folder from the template.
- Write the payment/workflow ledger only after Supabase verification.
- Record IDs and links, never secrets or raw access tokens.
- Treat Drive as a secondary reconciliation and delivery surface, not payment authority.

## Canva and Higgsfield

- External creative generation remains disabled until the connector is authenticated and the task has a recorded budget and rights approval.
- Estimate credits before generation and record actual cost per job.
- Poll asynchronous jobs; never start a second job merely because the first is slow.
- Enforce no more than 150 credits for three cinematic scenes or 200 for four scenes unless a new approved budget exists.

## Notification

- Transactional customer messages require a verified project state and approved delivery manifest.
- Outreach messages require the separate outreach approval and suppression pipeline.
- Do not mark messages “Not spam,” alter spam classification automatically, or send from an unauthorized mailbox.
