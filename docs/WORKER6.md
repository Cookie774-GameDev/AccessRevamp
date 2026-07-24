# Worker 6 Gmail routing

Worker 6 is a bounded, draft-only inbox monitor. Windows Task Scheduler launches it every 15 minutes, it records every Gmail message ID exactly once in Supabase, and it routes direct support, uniquely matched prospect replies, and human-review cases separately.

It cannot send email. It can only append a Gmail draft when an approved local composer command is configured. Payment, privacy, legal, security, abuse, unsubscribe, ambiguous, and unmatched messages always stop for human review.

## Required Windows environment

Set these as User or Machine environment variables without writing them into this repository:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
WORKER6_GMAIL_ADDRESS=support@accessrevamp.shop
WORKER6_GMAIL_APP_PASSWORD
WORKER6_GMAIL_IMAP_HOST=imap.gmail.com
WORKER6_GMAIL_IMAP_PORT=993
WORKER6_REPLY_COMPOSER_COMMAND
```

`WORKER6_GMAIL_APP_PASSWORD` must be a Google app password for the monitored mailbox. The account must have two-step verification and IMAP access. Forwarding messages into another Gmail account does not grant that account permission to send as `support@accessrevamp.shop`; configure and verify Gmail **Send mail as** separately.

Validate without opening the network:

```powershell
npm run email:worker6 -- --check-config
```

Install the task:

```powershell
& .\scripts\worker6\install-worker6-schedule.ps1
& .\scripts\worker6\verify-worker6-schedule.ps1
```

If any required credential is absent, the installer creates the task disabled and reports the missing variable. Do not enable it until the configuration check succeeds.
