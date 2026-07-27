# AccessRevamp Pre-launch Audit — 2026-07-27

This record distinguishes implemented controls from evidence still required.
It is not a claim that every external operation is launched.

## Verified and repaired

- Five permanent mailbox owners exist: Avery, Jordan, Kasey, Riley, and Morgan.
  Their generated manifests contain 20 active, outbound-authorized,
  reply-authorized Icemail mailboxes each.
- Worker 6 has a verified Windows Scheduled Task definition with a 15-minute
  interval. Reader IMAP, support SMTP, and Icemail reply transport credentials
  pass configuration verification without printing secrets. The task remains
  intentionally disabled until the controlled reply test.
- Worker 6 deduplicates by Gmail message ID, handles direct support through
  `support@accessrevamp.shop`, and routes prospect replies to the permanent
  owner of the original Icemail mailbox.
- UrBeauty's current Shopify catalog was imported as 71 exact, hashed source
  images across eight products. Every factual product image now has an explicit
  source, rights record, and verification state.
- Seven legacy UrBeauty concepts without exact verified source links were
  quarantined. No legacy concept is customer-visible.
- Customer-visible design publication now fails closed unless copy, rights,
  source-manifest, and product-fidelity reviews pass and every depicted factual
  asset links to a verified exact source record.
- Supabase RLS remains enabled. Redundant permissive deny policies were removed;
  server-only tables continue to deny browser access by default.
- Live Stripe transport readiness reports no blockers. The authenticated
  production wizard reached Stripe-hosted Checkout without submitting a charge.
- Stale unpaid Checkout Sessions are now reconciled after provider expiry
  without disabling checkout for every customer. The reconciliation is audited
  and does not grant an order or entitlement.
- The complete operational flow is documented in
  `docs/agent-system/PROCESS_MAP.html`.

## Intentionally held

- Automatic refunds remain disabled and require the two-person authorization
  workflow.
- Automatic tax remains disabled pending the owner's Louisiana tax
  determination.
- Active customer-site security testing requires project-specific written
  authorization. Passive review remains allowed.
- New UrBeauty homepage and Canva replacements are not customer-visible until
  they are rebuilt from the exact source manifest and pass human review.
- Worker 6 remains disabled until a controlled inbound support/reply test proves
  sender identity, routing, deduplication, and one-response behavior.

## External evidence still required

- Stripe sandbox Checkout needs a separate `sk_test_` key, test catalog, and
  test webhook. Live keys cannot be reused for this proof.
- Supabase leaked-password protection and managed backup/restore capabilities
  require the applicable paid plan.
- The owner must supply the lawful postal address before outbound cold outreach
  is enabled.
- A backup/restore exercise and incident-response tabletop must be completed and
  recorded before launch.
- Higgsfield production generation remains blocked until authenticated provider
  access and project-specific budget evidence exist.
