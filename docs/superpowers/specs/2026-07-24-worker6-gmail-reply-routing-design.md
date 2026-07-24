# Worker 6 Gmail Reply Routing Design

## Goal

Run one Windows-scheduled Worker 6 process every 15 minutes to read the monitored Gmail inbox, persist each inbound Gmail message exactly once, classify it, and create one durable support or inbox-owner assignment. The initial delivery mode is draft-only; no reply is sent automatically.

## Boundaries

- Worker 6 is the only inbox-polling process and the only direct-support owner.
- An inbox-owner assignment is created only when a reply can be matched to an existing, approved outreach record. Unmatched, payment, privacy, legal, abuse, or suspicious messages are held for human review.
- `message_id` is unique in the database. Re-running Worker 6, overlapping schedules, and Gmail pagination cannot create a second assignment or draft for the same inbound message.
- The worker reads and writes Gmail through an IMAP-enabled monitored Gmail or Google Workspace inbox using an app password held only in Windows credential/environment configuration. It does not use the interactive Codex Gmail plugin, browser state, or a personal mailbox password.
- All credentials remain outside the repository and Supabase browser tables. The Windows task runs under a dedicated local account with least privilege.
- Draft-only is the default. A future automatic-send change must be a deliberate configuration switch, a separate sender implementation, and a fresh review; it is not enabled by this work.

## Runtime

Windows Task Scheduler launches `npm run email:worker6` every 15 minutes with `MultipleInstances=IgnoreNew` and a five-minute execution limit. The worker exits nonzero on configuration, IMAP, or database failure so Task Scheduler records the failure. It never keeps an infinite loop alive.

The worker obtains only these machine-scoped variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
WORKER6_GMAIL_ADDRESS
WORKER6_GMAIL_APP_PASSWORD
WORKER6_GMAIL_IMAP_HOST=imap.gmail.com
WORKER6_GMAIL_IMAP_PORT=993
WORKER6_REPLY_COMPOSER_COMMAND
```

`WORKER6_REPLY_COMPOSER_COMMAND` is optional. Without it, Worker 6 persists the full context packet and marks the assignment `human_review`; it does not invent or send a reply. With it, the command receives a JSON context file path and returns a compliant draft body. The command is a separately configured model runtime; Codex itself cannot be woken by Windows Task Scheduler.

## Database Contract

Add three service-role-only tables:

1. `inbound_email_messages`
   - unique `gmail_message_id`; immutable envelope fields, normalized sender/recipient, subject, received timestamp, thread identifier, bounded body text, raw-header hash, classification, match record, processing status, and timestamps.
2. `inbound_email_assignments`
   - one row per inbound message; `assignment_kind` is `support`, `inbox_owner`, or `human_review`; `owner_key`, state (`queued`, `draft_ready`, `needs_review`, `completed`, `failed`), context JSON, optional Gmail draft identifier, failure information, and timestamps.
3. `inbound_email_worker_runs`
   - one row per Worker 6 execution; start/end timestamps, outcome, counts, and safe error summary.

RLS is enabled with no browser policies. The worker uses the existing Supabase service role. A single transaction/RPC inserts the message and assignment only on the first Gmail message ID. Duplicate delivery returns the existing row without creating new work.

## Classification and Routing

1. Fetch the newest inbox messages after the saved high-water mark, with a small overlap window. Ignore sent mail and previously stored message IDs.
2. Read the complete Gmail thread before classification.
3. If the message was sent directly to the designated support address and has no matching prospect/customer conversation, assign it to `support` and Worker 6 owns it.
4. If `In-Reply-To`, thread evidence, sender, and recipient match one approved outreach record, assign it to that record’s `mailbox_id` owner. Worker 6 records the owner key and queues the single owner-reply job.
5. If matching is ambiguous or the message concerns a payment, privacy request, legal request, security allegation, unsubscribe, abuse, or account access, assign `human_review`; no draft is created except a compliant opt-out confirmation where a suppression record is successfully written.
6. Worker 6 creates a Gmail draft only after an assignment reaches `draft_ready`. The draft reply preserves the Gmail thread and never includes secrets, customer-private data, legal claims, or payment assurances.

## Owner Worker Invocation

Worker 6 does not create persistent Codex subagents. It invokes a local owner-worker command for the assignment’s owner key. The owner-worker reads the durable assignment and relevant outreach/customer context, validates the reply guide, and either returns a draft payload or a reason to require human review. Worker 6 records that result and appends one reply draft to Gmail’s Drafts mailbox.

An owner worker cannot claim another owner’s assignment, send mail, change suppression state, or read unrelated customer data. Direct-support assignments bypass owner workers and are composed by Worker 6 under the same draft-only rules.

## Failure Handling

- IMAP and database operations have bounded retries with exponential backoff inside one scheduled run.
- A failed run is recorded and leaves unprocessed messages eligible for the next run.
- A malformed message, attachment, unsupported encoding, or oversized body is stored as a bounded metadata record and routed to `human_review`; it cannot stop the complete run.
- Worker 6 does not mark Gmail messages read, delete, archive, or label them until the durable insertion succeeds. Processing labels are optional audit aids, never the source of truth.
- A database kill switch disables owner-worker invocation and draft creation while still recording messages for review.

## Verification

- Unit tests cover duplicate Gmail IDs, ambiguous matches, support classification, owner-only routing, prohibited categories, draft-only enforcement, and error retry.
- Integration tests use a fake IMAP adapter and Supabase test client to prove one assignment and zero sent messages after repeated polling.
- A Windows task verification runs the process twice against one fixture, confirms the second run is a no-op, and confirms that one Gmail draft—not a sent email—exists for a valid owner assignment.
- Production enablement requires a controlled reply from an owned test address, a human review of the generated draft, and a check that no mail was sent automatically.

## Explicit Non-Goals

- No bulk outreach sending, mailbox warm-up, spam-folder manipulation, automatic sending, Gmail API push notifications, or interactive plugin automation.
- No claim that Windows can wake a Codex conversation. Windows runs the local Worker 6 program; the owner-worker command must be separately configured with a supported model runtime if AI draft composition is desired.
