# AccessRevamp Agent Operations System

This folder defines the customer-delivery operating system for AccessRevamp.

## Implemented foundation

- Stripe sandbox catalog for the $50, $200, and $250 one-time plans.
- Supabase plan-specific workflows, tasks, research sources, findings, security authorizations, design options, customer approvals, artifacts, deliveries, provider budgets, private storage, and an idempotent integration outbox.
- Automatic workflow bootstrap after a durable paid order creates a customer project.
- Cinematic scene choice of three or four during the order brief.
- Separate optional portfolio permission; purchase alone does not grant publication rights.
- Hashed, expiring, one-use customer approval links scoped to the intended project option group and revision round.
- Google Drive customer-folder root, customer template, runbooks, and a Payment and Workflow Ledger.
- Artifact guardrail of 9,000,000 bytes per file.
- Mailbox-aware outreach records with a 150-word target and 175-word hard maximum.
- Root `CLAUDE.md`, safe `.claude/settings.json`, and a verified Windows installer for the complete operations folder.
- A local Codex/Claude mailbox MCP for authorized one-mailbox reads, reply drafts, message-state updates, Icemail inventory, and durable audit logs. See [`MAILBOX_MCP.md`](./MAILBOX_MCP.md).

## Safety state

External email transport, automated mailbox warm-up, automated spam-classification actions, active security testing, external creative generation, live Stripe Checkout, and automated refunds remain disabled until their independent readiness gates pass.

The corrected operating assumption is 100 inboxes with five cold and five provider-managed warm-up messages per inbox each day. That equals 500 cold messages plus 500 warm-up messages: 1,000 total messages per day. The cold-outreach queue is still capped at the lower of 500, the configured database ceiling, the number of active authorized mailboxes, and provider, reputation, legal, complaint, suppression, and operator limits. The system must not force 1,000 sends when any mailbox or safety gate is unavailable.

## Canonical plans

- Homepage Reveal — $50.
- Complete Website Revamp — $200.
- Cinematic Scroll Site — $250.

The reference to $209 was treated as a typo because the active website and Stripe sandbox catalog use $200.

## Agent files

- [`mainagent.md`](./mainagent.md)
- [`subagentforcustomer.md`](./subagentforcustomer.md)
- [`subagentforwebsite.md`](./subagentforwebsite.md)
- [`subagentfordesign.md`](./subagentfordesign.md)
- [`subagentforsecurity.md`](./subagentforsecurity.md)
- [`subagentforintegrations.md`](./subagentforintegrations.md)
- [`integrationworker.md`](./integrationworker.md)

## Canonical skills

- `cinematic-scroll`
- `customer-delivery`
- `design-brief`
- `growth-optimization`
- `outreach`
- `payment-reconciliation`
- `quality-assurance`
- `security-audit`
- `website-audit`
- `website-build`
- `website-research`

Each skill lives at `skills/<name>/SKILL.md`. The `templates/` folder contains per-customer skill, design, folder, payment, approval, and delivery structures.

## Claude Code installation

See [`CLAUDE_INSTALL.md`](./CLAUDE_INSTALL.md), or run `INSTALL_CLAUDE_OPERATIONS.cmd` from the repository root. The installer writes the complete system to the actual Windows Documents known folder at `Claude\AccessRevamp`, backs up any prior installation, and runs local verification before writing an installation receipt.

## Deployment truth

Source code and database schema are not proof that an external provider is connected. Icemail, Gmail, Canva, Higgsfield, and local-computer file access require their own authenticated connectors. The system must keep the related switches disabled until a real end-to-end test succeeds.
