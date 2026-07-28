# AccessRevamp Agent Operations System

This folder defines the customer-delivery operating system for AccessRevamp.

Every agent and skill must read and obey [APPROVAL_PROTOCOL.md](APPROVAL_PROTOCOL.md)
before starting customer work.

Open [PROCESS_MAP.html](PROCESS_MAP.html) for the complete interactive system diagram covering the five permanent mailbox owners, Worker 6, payment reconciliation, isolated customer agents, exact-asset creative production, plan branches, website implementation, QA, and private delivery.

## Implemented foundation

- Mode-separated Stripe catalogs for the $50, $200, and $250 one-time plans,
  with live Checkout guarded by catalog, secret, webhook, and runtime checks.
- Supabase plan-specific workflows, tasks, research sources, findings, security authorizations, design options, customer approvals, artifacts, deliveries, provider budgets, private storage, and an idempotent integration outbox.
- Automatic workflow bootstrap after a durable paid order creates a customer project.
- The paid Homepage Reveal workflow requires owner-reviewed options, one to
  three unique choices ranked in customer preference order, customer-specific
  `SKILL.md` and `DESIGN.md` artifacts based on rank one with separate owner
  reviews, and a final delivery-manifest handoff/stop gate. Every ranked option
  must be customer-visible, owner-reviewed, and scoped to the same project and
  revision. Those documents are internal handoff evidence; customer-facing
  outputs remain the sourced audit and five concepts. The plan does not include
  website, page-reference, or poster implementation.
- Cinematic scene choice of three or four during the order brief.
- Separate optional portfolio permission; purchase alone does not grant publication rights.
- Hashed, expiring, one-use customer approval links scoped to the intended project option group and revision round.
- Google Drive customer-folder root, customer template, runbooks, and a Payment and Workflow Ledger.
- Artifact guardrails follow the actual destination provider and storage configuration; no universal browser-chat file limit applies to Codex.
- Mailbox-aware first-touch outreach records with a 150–185-word target and 200-word hard maximum. Reply limits are governed separately by the reply-response guide.
- Five permanent inbox owners—Avery, Jordan, Kasey, Riley, and Morgan—each own exactly 20 Icemail Azure mailboxes. Assignments do not rotate.
- This system handles at most five cold-or-reply sends per mailbox per America/Chicago day. Icemail’s own warm-up feature is outside Worker 6 and is not generated, classified, or marked “not spam” by AccessRevamp agents.
- Root `CLAUDE.md`, safe `.claude/settings.json`, and a verified Windows installer for the complete operations folder.

## Safety state

Automated mailbox warm-up, automated spam-classification actions, active
security testing, unreviewed external creative generation, and automated
refunds remain disabled. Live Stripe Checkout is enabled only while its
independent readiness gates pass and fails closed when they do not.

AccessRevamp owns only the cold-or-reply allocation: no more than five combined sends from each mailbox per America/Chicago day, or 500 across 100 fully authorized mailboxes. Icemail separately manages warm-up; AccessRevamp agents do not generate those messages or manipulate spam classifications. The system must not force 500 sends when any mailbox, suppression, consent, reputation, legal, complaint, or operator gate is unavailable.

## Private Owner Command Center protocol

The command center is a private owner command center running only on the
owner's computer; it is not a route on the customer website. All customer
creative work is registered against one exact project ID. Agents
submit immutable versions with parent lineage, source evidence, products and
services represented, exact copy, fonts, UI patterns, brand identity, color
relationships and patterns, customer preferences/dislikes, and QA evidence.
Owner critique creates a durable assigned task. Agents never self-approve.
Design approval and customer delivery approval are separate; no email,
dashboard publication, or customer-ready status is allowed before the latter.

## Canonical plans

- Homepage Reveal — $50: sourced audit and five homepage concepts, followed
  internally by a safe rank-ordered selection of one to three concepts,
  reviewed customer `SKILL.md` and `DESIGN.md` based on rank one, then delivery
  handoff and stop.
- Complete Website Revamp — $200.
- Cinematic Scroll Site — $250.

The reference to $209 was treated as a typo because the active website and
canonical Stripe catalogs use $200.

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

## Codex authority

This is a Codex operations system. Root `AGENTS.md` is the repository authority;
the files in this directory are the bounded agent contracts and skills it
references. `CLAUDE.md`, `.claude/`, and `CLAUDE_INSTALL.md` are retained only
as legacy compatibility artifacts and do not override `AGENTS.md`, current
Supabase state, or verified provider evidence.

## Deployment truth

Source code and database schema are not proof that an external provider is
connected. Each provider requires current authenticated evidence and a real
end-to-end test. A provider remains fail-closed when its proof is missing.
