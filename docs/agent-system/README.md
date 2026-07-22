# AccessRevamp Agent Operations System

This folder defines the customer-delivery operating system for AccessRevamp.

## Implemented foundation

- Stripe sandbox catalog for the $50, $200, and $250 one-time plans.
- Supabase plan-specific workflows, tasks, research sources, findings, security authorizations, design options, customer approvals, artifacts, deliveries, provider budgets, private storage, and an idempotent integration outbox.
- Automatic workflow bootstrap after a durable paid order creates a customer project.
- Cinematic scene choice of three or four during the order brief.
- Separate optional portfolio permission; purchase alone does not grant publication rights.
- Hashed, expiring, one-use customer approval links.
- Google Drive customer-folder root, customer template, runbooks, and a Payment and Workflow Ledger.
- Artifact guardrail of 9,000,000 bytes per file.
- Mailbox-aware outreach records with a 150-word target and 175-word hard maximum.

## Safety state

External email transport, automated mailbox warm-up, automated spam-classification actions, active security testing, external creative generation, live Stripe Checkout, and automated refunds remain disabled until their independent readiness gates pass.

The corrected operating assumption is 100 inboxes with five cold and five provider-managed warm-up messages per inbox each day. That equals 500 cold messages plus 500 warm-up messages: 1,000 total messages per day. The cold-outreach queue is still capped at the lower of 500, the configured database ceiling, the number of active authorized mailboxes, and provider, reputation, legal, complaint, suppression, and operator limits. The system must not force 1,000 sends when any mailbox or safety gate is unavailable.

## Canonical plans

- Homepage Reveal — $50.
- Complete Website Revamp — $200.
- Cinematic Scroll Site — $250.

The reference to $209 was treated as a typo because the active website and Stripe sandbox catalog use $200.

## Files

- [`mainagent.md`](./mainagent.md)
- [`subagentforcustomer.md`](./subagentforcustomer.md)
- [`subagentforwebsite.md`](./subagentforwebsite.md)
- [`subagentfordesign.md`](./subagentfordesign.md)
- [`subagentforsecurity.md`](./subagentforsecurity.md)
- [`integrationworker.md`](./integrationworker.md)
- `skills/` — reusable operating skills.
- `templates/` — per-customer skill, design, folder, payment, approval, and delivery structures.

## Deployment truth

Source code and database schema are not proof that an external provider is connected. Icemail, Gmail, Canva, Higgsfield, and local-computer file access require their own authenticated connectors. The system must keep the related switches disabled until a real end-to-end test succeeds.
