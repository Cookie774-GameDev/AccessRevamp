# Worker 6 Gmail routing

Worker 6 (Sage) is a bounded inbox monitor. Windows Task Scheduler can launch it every 15 minutes, it records every Gmail message ID exactly once in Supabase, and it routes direct support, uniquely matched prospect replies, and human-review cases separately. The task stays disabled until the controlled reply test passes.

The merged `combatonline02@gmail.com` inbox is read-only routing infrastructure; it is never a visible sender. Direct support replies authenticate and send as `support@accessrevamp.shop`. Uniquely matched ordinary prospect replies authenticate and send through the original Icemail Azure mailbox. Payment, privacy, legal, security, abuse, unsubscribe/“no thanks,” ambiguous, and unmatched messages always stop for human review.

Automatic sending is separately gated by `WORKER6_AUTO_SEND_ENABLED`. It defaults to `false`. In review mode, Worker 6 creates a draft with the intended sender identity. In automatic mode, it reserves the original mailbox’s daily capacity before a reply, enforces a maximum of five cold-or-reply messages per mailbox per America/Chicago day, sends through the correct transport, and stores the provider message ID and full durable thread record.

## Required Windows environment

Set these as User or Machine environment variables without writing them into this repository:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
WORKER6_GMAIL_ADDRESS=combatonline02@gmail.com
WORKER6_GMAIL_APP_PASSWORD
WORKER6_GMAIL_IMAP_HOST=imap.gmail.com
WORKER6_GMAIL_IMAP_PORT=993
WORKER6_SUPPORT_SMTP_USERNAME=support@accessrevamp.shop
WORKER6_SUPPORT_SMTP_PASSWORD
WORKER6_SUPPORT_FROM_ADDRESS=support@accessrevamp.shop
WORKER6_SUPPORT_SMTP_HOST=smtp.gmail.com
WORKER6_SUPPORT_SMTP_PORT=587
WORKER6_REPLY_COMPOSER_COMMAND
WORKER6_AUTO_SEND_ENABLED=false
ICEMAIL_API_KEY
```

The Gmail reader and Workspace support sender use separate app passwords and separate authenticated identities. Icemail mailbox passwords are fetched just in time from the official Icemail API, used only in memory, and never written to Markdown, Supabase, or logs.

Validate without opening the network:

```powershell
npm run email:worker6 -- --check-config
```

Verify all three transports without sending:

```powershell
npm run email:worker6:verify
```

Install the task:

```powershell
& .\scripts\worker6\install-worker6-schedule.ps1
& .\scripts\worker6\verify-worker6-schedule.ps1
```

The installer always creates the task disabled unless `-EnableAfterVerification` is explicitly supplied. Do not enable it or set `WORKER6_AUTO_SEND_ENABLED=true` until the controlled end-to-end test passes.
