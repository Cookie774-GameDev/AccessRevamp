# Human-reviewed outreach operations

**Status:** `IMPLEMENTED` safety foundation, `PLANNED` operator workflow refinement, `EXTERNALLY BLOCKED` sender/jurisdiction readiness, and `LAUNCH-ONLY` sending authorization. Sending remains disabled.

**Owner:** Operations with privacy/legal, security, product, and engineering review.

**Authority:** [approved rebuild specification](superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md) and the [account/operations plan](superpowers/plans/2026-07-18-accessrevamp-account-operations.md).

## Purpose and boundary

Outreach may introduce a manually verified public-site observation and an optional private concept to a business with a documented public contact path. It is not a vulnerability campaign, automated diagnosis, threat, fake reply, scraped-directory blast, or substitute for consent and jurisdiction-specific legal review.

`sending_enabled` stays `false`. The repository contains no unattended bulk-mail loop. A draft, approval record, or queue state does not prove a message was sent. No outreach is sent as part of this rebuild.

## Required order of operations

1. Select a business manually or through an approved import capped to the reviewed batch.
2. Record public source URL, retrieval time, contact provenance, business identity, and jurisdiction context.
3. Run passive public-homepage review within the scanner boundary.
4. A person verifies every prospect-facing observation, evidence item, severity/confidence label, and claim.
5. Check permanent suppression and prior opt-out before preview or draft creation.
6. Create a private preview only from approved, rights-safe content; store only a token hash; set expiry and `noindex`.
7. Draft plain, specific copy with real sender identity, reply path, postal address when required, preview expiry, and one-click opt-out.
8. A different or explicitly accountable human approves the exact subject, body, recipient, finding, evidence, and link.
9. Recheck suppression, daily ceiling, sender readiness, and global kill switch immediately before any future send.
10. Record disposition, opt-out, bounce/complaint handling, and audit evidence.

The database hard maximum is 1,000 queued/scheduled/sent items per UTC day. Lower mailbox, provider, reputation, legal, and operational limits may apply. Attempt 1,001 must fail transactionally, including under concurrent queue workers. Suppression is permanent unless a lawful, audited correction process applies; contacting a different employee to evade an opt-out is prohibited.

## Official preparation ramp

The recommended preparation ramp remains 15 human-reviewed drafts per day for program days 1–4, 20 per day for days 5–14, and 22 per day from day 15 onward. The 1,000-per-day database value is only a technical ceiling and does not authorize starting at that volume. Any higher operating rate requires mailbox reputation, bounce and complaint monitoring, legal review, and a separately approved sender plan. Sending remains disabled, and every record still requires the full evidence, approval, suppression, opt-out, sender-readiness, and jurisdiction checks above.

## Claim standard

Use plain observations such as a keyboard path that could not be completed or a visible mobile hierarchy issue, with evidence and confidence. Do not claim legal noncompliance, confirmed security vulnerabilities from passive signals, lost revenue without first-party analytics, guaranteed results, urgency through fear, or knowledge of private business conditions. Never use fake `Re:`/`Fwd:` subjects or imply an existing relationship.

Private previews are labeled as concepts, watermarked, token-protected, expiring, revocable, and disconnected from live inventory, forms, accounts, checkout, analytics, and third-party trackers. The preview must not look like the prospect’s live site and must not use unlicensed logos, photography, copy, or customer data.

Google Drive may store internal operator context only. It is not read by public routes, and prospect records, secrets, access tokens, or raw Drive links are never copied into browser assets. Optional Sheets handoff is review-only and does not request Gmail permission or send messages.

## Delivery states

### IMPLEMENTED

Current schema and scripts include contact provenance, structured findings/evidence, hashed expiring previews, suppression, opt-out, approval records, audit records, a concurrency-safe database daily ceiling, and disabled-by-default sending posture.

### PLANNED

The rebuild provides a clearer operator workspace for research, approval, preview lifecycle, suppression, queue state, kill switches, and evidence export without adding unattended transport.

### EXTERNALLY BLOCKED

Real sender identity, reply-capable mailbox, postal address, domain authentication, bounce/complaint processing, jurisdiction review, and owned operator authorization are not present in source and cannot be inferred.

### LAUNCH-ONLY

Changing `sending_enabled`, configuring a transport, scheduling a campaign, or sending even one real message requires explicit approval after readiness review and a small monitored test. This rebuild does not authorize it.

## Validation

Run suppression-first tests, attempt-1,001 ceiling tests, concurrent queue-transition tests, approval-integrity tests, opt-out idempotency tests, preview token/expiry/revocation tests, browser-role denial tests, and a code search proving no transport bypass. Final evidence states the number sent; for this rebuild it must remain zero unless the user later grants explicit, separate authorization.
