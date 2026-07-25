# Final Auth and Mailbox Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair sign-in OTP completion and make mailbox ownership and reply sender routing durable and testable.

**Architecture:** Supabase stores immutable mailbox ownership and workflow state. Cloudflare completes authentication with one bearer token. Worker 6 reads CombatOnline but uses separate verified transports for support and original-mailbox replies.

**Tech Stack:** Node.js, Supabase/Postgres, Supabase Auth, Cloudflare Workers/Vinext, Gmail IMAP/SMTP, Icemail.

## Global Constraints

- Five owners named Avery, Jordan, Casey, Riley, and Morgan receive exactly twenty permanent mailboxes each.
- Worker 6 is Sage and remains disabled until the controlled test passes.
- Daily outreach remains manual at 12:00 AM America/Chicago.
- Icemail handles warmup; this system does not automate warmup or spam classification.
- Paid-customer agent handoff requires human approval.
- Secrets never enter source, logs, Markdown, or browser bundles.

### Task 1: Repair OTP completion

**Files:** `tests/supabase-public-auth-header.test.mjs`, `netlify/functions/_shared/supabase-public.mjs`

- [ ] Write a failing test that captures the outgoing `/auth/v1/user` request and requires exactly one bearer value.
- [ ] Run the test and confirm the current duplicate comma-separated header fails.
- [ ] Canonicalize the custom Authorization header.
- [ ] Run focused auth tests and the full auth suite.

### Task 2: Add immutable owner registry

**Files:** new Supabase migration, assignment script, owner manifests, orchestration tests.

- [ ] Write failing tests for five owners, twenty mailboxes each, no overlap, immutability, and service-only access.
- [ ] Add the registry and idempotent assignment function.
- [ ] Apply the migration and populate from exactly 100 active Icemail rows.
- [ ] Generate redacted owner manifests and verify their hashes/counts.

### Task 3: Separate reader and sender transports

**Files:** Worker 6 config, support SMTP adapter, owner routing adapter, tests, `docs/WORKER6.md`.

- [ ] Write failing tests requiring CombatOnline read-only, exact support From identity, and original Icemail owner identity.
- [ ] Add strict support SMTP configuration and transport verification.
- [ ] Add owner routing jobs that cannot send as CombatOnline or another owner.
- [ ] Keep restricted and ambiguous messages under human review.

### Task 4: Verify paid handoff and release

**Files:** orchestration tests and operating docs.

- [ ] Verify signed-payment workflow bootstrap and human approval before customer-agent activation.
- [ ] Run full tests, build, secret scan, dependency audit, and Supabase advisors.
- [ ] Commit, push, merge through checked GitHub PR, deploy Cloudflare, and verify live auth.
- [ ] Leave Worker 6 disabled until the user-run controlled test.
