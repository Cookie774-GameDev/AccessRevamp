# AccessRevamp Pre-launch Audit — 2026-07-27

This record distinguishes implemented controls from evidence still required.
It is not a claim that every external operation is launched.

## 2026-07-28 audit remediation

- The Stripe webhook payload now matches the connected production
  `fulfill_accessrevamp_checkout(jsonb)` tax-aware contract:
  `tax_cents`, `amount_total_cents`, and `tax_collection_mode` are derived from
  the re-retrieved signed Checkout Session and validated before fulfillment.
- Homepage Reveal reconciliation is now a deferred constraint trigger, so a
  pre-recorded customer ranking cannot recursively complete and then be
  overwritten by the outer workflow advancement.
- Homepage feedback is accepted while its task is still blocked before
  activation, rejected feedback is excluded, and only terminal task states
  reject later rankings.
- Webhook liveness now compares `last_checkout_created_at` with
  `last_successful_webhook_at` after stale-session reconciliation. It records a
  focused incident without treating one abandoned Checkout Session as a global
  transport outage.
- Public sitemap URLs now use `https://accessrevamp.com`, public routes emit
  canonical metadata, private routes remain noindex, and unknown Cloudflare
  application routes return an actual HTTP 404.
- The connected Supabase migration was applied and its deferred trigger was
  verified. Supabase security advisors report only the externally controlled
  leaked-password-protection warning.
- Local verification passes: 394 tests, lint, production build, secret scan,
  and production dependency audit.

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

## 2026-07-28 strict-audit remediation, round two

- Unsupported customer-count copy, URL-carried authentication secrets,
  indefinite browser order drafts, origin-derived Stripe return URLs, forced
  Stripe Customer duplication, MIME-only uploads, false webhook liveness,
  missing dispute reconciliation, conflicting refund copy, obsolete deployment
  workflows, and the missing deployed-route smoke gate were corrected.
- The connected Supabase project now has event-specific payment telemetry, a
  service-role-only dispute ledger/reconciliation path, and an explicit
  restrictive browser-deny policy. Its security advisor reports only the
  externally controlled leaked-password-protection warning.
- Local evidence now passes 407 tests, lint across 359 files, the production
  build, 10/10 requirement checks, a zero-finding secret scan, and a production
  dependency audit with zero vulnerabilities.
- No payment, refund, dispute, entitlement, or customer record was fabricated
  during remediation. No successful live purchase is claimed.
- Full finding classification and evidence are recorded in
  `docs/evidence/AUDIT_REMEDIATION_2026-07-28.md`.
