# Human-reviewed outreach operations

**Status:** `IMPLEMENTED` safety foundation, `PLANNED` operator workflow refinement, `EXTERNALLY BLOCKED` sender/jurisdiction readiness, and `LAUNCH-ONLY` sending authorization. Sending remains disabled.

**Owner:** Operations with privacy/legal, security, product, and engineering review.

**Authority:** [approved rebuild specification](superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md), the [account/operations plan](superpowers/plans/2026-07-18-accessrevamp-account-operations.md), and the [first-touch cold-email prompt](COLD_EMAIL_SYSTEM_PROMPT.md).

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
7. Draft plain, specific copy with real sender identity, reply path, postal address when required, the plain-text website address `accessrevamp.com`, no first-touch sales or intake link, and a clear opt-out.
8. A different or explicitly accountable human approves the exact subject, body, recipient, finding, evidence, any legally required compliance link or header, and the absence of a questionnaire, checkout, payment, preview, shortened, tracked, or personalized sales URL.
9. Recheck suppression, daily ceiling, sender readiness, and global kill switch immediately before any future send.
10. Record disposition, opt-out, bounce/complaint handling, and audit evidence.

The database maximum is 20 queued/scheduled/sent items per UTC day. Lower operational limits may apply. Attempt 21 must fail transactionally. Suppression is permanent unless a lawful, audited correction process applies; contacting a different employee to evade an opt-out is prohibited.

## Official preparation ramp

The requested first-touch target is 10 messages per day in week 1, 12 per day in week 2, 15 per day in week 3, 18 per day in week 4, 20 per day in week 5, 22 per day in week 6, and 22 per day for the following 30 days. The repository safety ceiling remains 20 per UTC day, so the week-6 and following-month stages may prepare up to 22 human-reviewed drafts but may approve or send no more than 20; overflow remains unsent. Any later increase requires a separately reviewed policy, schema, deliverability, complaint, suppression, legal, and sender-readiness change. This ramp governs distinct, eligible businesses; it never authorizes indefinite follow-up to the same recipient. Sending remains disabled, and every record still requires the full evidence, approval, suppression, opt-out, sender-readiness, and jurisdiction checks above.

## Claim standard

Use plain observations such as a keyboard path that could not be completed or a visible mobile hierarchy issue, with evidence and confidence. Do not claim legal noncompliance, confirmed security vulnerabilities from passive signals, lost revenue without first-party analytics, guaranteed results, urgency through fear, or knowledge of private business conditions. Never use fake `Re:`/`Fwd:` subjects or imply an existing relationship.

Private previews are labeled as concepts, watermarked, token-protected, expiring, revocable, and disconnected from live inventory, forms, accounts, checkout, analytics, and third-party trackers. The preview must not look like the prospect’s live site and must not use unlicensed logos, photography, copy, or customer data.

Google Drive may store internal operator context only. It is not read by public routes, and prospect records, secrets, access tokens, or raw Drive links are never copied into browser assets. Optional Sheets handoff is review-only and does not request Gmail permission or send messages.

## Delivery states

### IMPLEMENTED

Current schema and scripts include contact provenance, structured findings/evidence, hashed expiring previews, suppression, opt-out, approval records, audit records, a database daily ceiling, and disabled-by-default sending posture.

### PLANNED

The rebuild provides a clearer operator workspace for research, approval, preview lifecycle, suppression, queue state, kill switches, and evidence export without adding unattended transport.

### EXTERNALLY BLOCKED

Real sender identity, reply-capable mailbox, postal address, domain authentication, bounce/complaint processing, jurisdiction review, and owned operator authorization are not present in source and cannot be inferred.

### LAUNCH-ONLY

Changing `sending_enabled`, configuring a transport, scheduling a campaign, or sending even one real message requires explicit approval after readiness review and a small monitored test. This rebuild does not authorize it.

## Validation

Run suppression-first tests, attempt-21 ceiling tests, approval-integrity tests, opt-out idempotency tests, preview token/expiry/revocation tests, browser-role denial tests, and a code search proving no transport bypass. Final evidence states the number sent; for this rebuild it must remain zero unless the user later grants explicit, separate authorization.