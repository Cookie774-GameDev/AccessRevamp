# Worker 6 Gmail Reply Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows-scheduled Worker 6 that polls one Gmail inbox every 15 minutes, stores each inbound message exactly once, routes it durably, and creates reviewable Gmail drafts without sending messages.

**Architecture:** A Node Worker 6 process uses IMAP to read the monitored Gmail inbox and Supabase service-role RPCs to persist and atomically assign messages. A Windows Scheduled Task invokes the process every 15 minutes with overlap blocked. Worker 6 may invoke an explicitly configured local draft-composer command, but unattended sending remains impossible in this feature.

**Tech Stack:** Node 22 ESM, `imapflow`, `mailparser`, `@supabase/supabase-js`, PostgreSQL/Supabase migrations, Windows PowerShell Task Scheduler, Node test runner.

## Global Constraints

- Never store Gmail app passwords, service keys, or customer message bodies in source control.
- Worker 6 creates drafts only; it contains no SMTP send operation or Gmail send call.
- Only Worker 6 polls Gmail. Owner workers receive durable assignments and cannot claim another owner’s work.
- Every inbound Gmail message is deduplicated by its Gmail message ID inside PostgreSQL.
- Browser roles have no access to the new tables or RPCs.
- The scheduler runs every 15 minutes with `IgnoreNew` overlap protection and no infinite process.

---

### Task 1: Add durable inbound-message and assignment storage

**Files:**
- Create: `supabase/migrations/20260724120000_worker6_inbound_reply_routing.sql`
- Modify: `tests/customer-agent-orchestration.test.mjs`

**Interfaces:**
- Produces `record_accessrevamp_inbound_email`, `claim_accessrevamp_inbound_assignment`, and `complete_accessrevamp_inbound_assignment` service-only RPCs.

- [ ] **Step 1: Write the failing test**

```js
test('Worker 6 storage is service-only, deduplicated, and draft-only', () => {
  assert.match(worker6Sql, /gmail_message_id text not null unique/);
  assert.match(worker6Sql, /assignment_kind text not null check/);
  assert.match(worker6Sql, /record_accessrevamp_inbound_email/);
  assert.doesNotMatch(worker6Sql, /smtp|sendMail|gmail\.users\.messages\.send/i);
});
```

- [ ] **Step 2: Run `node --test tests/customer-agent-orchestration.test.mjs` and confirm the missing-storage failure.**
- [ ] **Step 3: Add the migration.** Create `inbound_email_messages`, `inbound_email_assignments`, and `inbound_email_worker_runs`; enable RLS with browser-deny policies. The insert RPC uses `ON CONFLICT (gmail_message_id) DO NOTHING` and returns the existing assignment on a duplicate.
- [ ] **Step 4: Re-run the focused test and confirm it passes.**
- [ ] **Step 5: Commit.** `git add supabase/migrations/20260724120000_worker6_inbound_reply_routing.sql tests/customer-agent-orchestration.test.mjs && git commit -m "feat: add Worker 6 inbound reply storage"`

### Task 2: Implement IMAP and configuration adapters

**Files:**
- Create: `scripts/worker6/config.mjs`
- Create: `scripts/worker6/gmail-imap.mjs`
- Create: `tests/worker6-config.test.mjs`
- Modify: `package.json`

**Interfaces:**
- `loadWorker6Config(env)` returns validated non-secret connection and runtime configuration.
- `listInboundMessages(config, { after })` returns bounded normalized messages with Gmail message/thread IDs and thread text.
- `appendDraft(config, draft)` appends to the Gmail Drafts mailbox and never sends.

- [ ] **Step 1: Write failing tests.**

```js
test('Worker 6 requires service and Gmail app-password configuration', () => {
  assert.throws(() => loadWorker6Config({}), /SUPABASE_URL/);
  assert.throws(() => loadWorker6Config(validEnvWithoutAppPassword), /WORKER6_GMAIL_APP_PASSWORD/);
});
test('the Gmail adapter has no send capability', async () => {
  assert.doesNotMatch(await readFile(adapterPath, 'utf8'), /sendMail|smtp|submitMessage/i);
});
```

- [ ] **Step 2: Run `node --test tests/worker6-config.test.mjs` and confirm imports are missing.**
- [ ] **Step 3: Install `imapflow@1.1.1` and `mailparser@3.7.4`; implement TLS IMAP port 993, 100 KiB body limits, 25-message thread limits, and special-use Drafts append with `\\Draft`.**
- [ ] **Step 4: Re-run the focused test and confirm it passes.**
- [ ] **Step 5: Commit.** `git add package.json package-lock.json scripts/worker6 tests/worker6-config.test.mjs && git commit -m "feat: add Worker 6 IMAP adapters"`

### Task 3: Implement routing and draft-only orchestration

**Files:**
- Create: `scripts/worker6/index.mjs`
- Create: `scripts/worker6/routing.mjs`
- Create: `scripts/worker6/composer.mjs`
- Create: `tests/worker6-routing.test.mjs`
- Modify: `package.json`

**Interfaces:**
- `classifyInboundMessage(message, matches)` returns `support`, `inbox_owner`, or `human_review`.
- `runWorker6({ config, imap, repository, compose })` returns counters.
- `composeDraft(context, command)` returns a validated draft or review reason.

- [ ] **Step 1: Write failing routing tests.**

```js
test('direct support stays with Worker 6', () => assert.equal(classifyInboundMessage(directSupport, []), 'support'));
test('a unique approved match routes only to its owner', () => assert.deepEqual(routeInboundMessage(reply, [match]), { kind: 'inbox_owner', ownerKey: 'mailbox:mbx_1' }));
test('restricted messages require review', () => restricted.forEach((m) => assert.equal(classifyInboundMessage(m, matches), 'human_review'));
test('a repeated ID has one assignment, one draft, and no sent mail', async () => assert.equal((await runWorker6(fake)).draftsCreated, 1));
```

- [ ] **Step 2: Run `node --test tests/worker6-routing.test.mjs` and confirm imports are missing.**
- [ ] **Step 3: Implement Worker 6.** Start/end a run audit; list an overlap window; read thread context; route only unique approved outreach replies to their mailbox owner; hold ambiguous, payment, privacy, legal, abuse, security, and unsubscribe content for review. Insert before draft generation. With no composer command, mark `needs_review`; otherwise validate the returned draft before `appendDraft`.
- [ ] **Step 4: Re-run focused routing tests and confirm they pass.**
- [ ] **Step 5: Commit.** `git add scripts/worker6/index.mjs scripts/worker6/routing.mjs scripts/worker6/composer.mjs tests/worker6-routing.test.mjs package.json && git commit -m "feat: route Gmail replies through Worker 6"`

### Task 4: Install and verify Windows Task Scheduler

**Files:**
- Create: `scripts/worker6/install-worker6-schedule.ps1`
- Create: `scripts/worker6/verify-worker6-schedule.ps1`
- Create: `docs/WORKER6.md`
- Create: `tests/worker6-schedule.test.mjs`

**Interfaces:**
- Installer creates `AccessRevamp-Worker6` at 15-minute intervals with `IgnoreNew`, five-minute execution limit, and `npm run email:worker6` action.
- Verifier returns nonzero on any schedule mismatch.

- [ ] **Step 1: Write the failing scheduler test.**

```js
test('Worker 6 runs every fifteen minutes without overlap', async () => {
  const installer = await readFile(installerPath, 'utf8');
  assert.match(installer, /New-TimeSpan -Minutes 15/);
  assert.match(installer, /IgnoreNew/);
  assert.match(installer, /AccessRevamp-Worker6/);
  assert.match(installer, /npm run email:worker6/);
});
```

- [ ] **Step 2: Run `node --test tests/worker6-schedule.test.mjs` and confirm the installer is missing.**
- [ ] **Step 3: Implement installer/verifier/guide.** The installer writes no secrets, starts PowerShell in repo root, runs `npm run email:worker6`, has `IgnoreNew`, five-minute execution limit, and start-when-available. The verifier reads task XML/settings. Document app-password setup, environment variables, `--check-config`, and the auto-send prohibition.
- [ ] **Step 4: Run `node --test tests/worker6-schedule.test.mjs && npm run email:worker6 -- --check-config`; confirm configuration checking has no network/draft/send side effect.**
- [ ] **Step 5: Commit.** `git add scripts/worker6 docs/WORKER6.md tests/worker6-schedule.test.mjs && git commit -m "feat: schedule Worker 6 every fifteen minutes"`

### Task 5: Apply and verify production-safe foundations

**Files:**
- Modify: `docs/WORKER6.md`
- Test: `tests/worker6-config.test.mjs`
- Test: `tests/worker6-routing.test.mjs`
- Test: `tests/worker6-schedule.test.mjs`

- [ ] **Step 1: Run `node --test tests/worker6-*.test.mjs && npm test`; require zero failures.**
- [ ] **Step 2: Apply the migration with the existing authorized Supabase connection, then verify the tables/RPCs via service role without printing credentials.**
- [ ] **Step 3: Install and verify `AccessRevamp-Worker6` only after a Gmail app password is configured.** Use `install-worker6-schedule.ps1` then `verify-worker6-schedule.ps1`. If credentials are absent, record the worker as installed but disabled; do not claim monitoring is live.
- [ ] **Step 4: Commit the final verification status.** `git add docs/WORKER6.md && git commit -m "docs: record Worker 6 deployment verification"`

## Plan Review

- Coverage: durable storage, IMAP-only access, routing, draft-only composition, scheduling, and deployment verification each have an isolated task and test.
- No placeholders: missing credentials disable the worker rather than triggering a guessed connection.
- Consistency: every task uses the Worker 6 name, `AccessRevamp-Worker6` task, service-role-only storage, and draft-only handling.
