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

Icemail’s Azure allocation of five cold plus five warm-up messages per mailbox means ten mailboxes support 50 cold and 50 warm-up messages per day: 100 total. The database’s 1,000 value is a technical ceiling only. Reaching 1,000 at that allocation would require 100 healthy authorized mailboxes and still requires provider, reputation, legal, complaint, suppression, and operator readiness.

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
