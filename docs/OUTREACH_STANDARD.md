# Responsible outreach standard

AccessRevamp may prepare up to 20 first-touch U.S. business messages per UTC day only after every database and human-review gate passes. Low volume does not remove commercial-email obligations.

## Allowed source data

Use a business contact address that the business intentionally publishes for relevant inquiries. Record the exact public page where the address appears and the public storefront URL. Do not buy opaque lists, infer private addresses, evade access controls, rotate employees to evade an opt-out, or collect sensitive personal data.

## Claim standard

A scanner signal is a lead, not a customer-facing finding. Outreach may describe one **human-verified accessibility or usability observation** with evidence, the affected user/task, and careful limitations. Use the finding model’s separate labels:

- Severity: `blocking`, `serious`, `moderate`, or `improvement`.
- Confidence: `verified`, `high_confidence_automated`, or `needs_manual_review`.

Only `verified` findings may appear in outreach. Do not describe passive observations as proven security vulnerabilities, compromise, breach, legal noncompliance, a lawsuit threat, or guaranteed financial impact.

## Required message elements

- Honest sender and business identity.
- Specific reason the message is relevant.
- The public page reviewed and the affected element or task.
- Accurate, restrained, human-approved wording.
- AccessRevamp website URL; no URL shortener.
- Exact one-time price when a plan is mentioned: **$50** or **$199**.
- Working reply path.
- Valid postal address where required.
- Clear opt-out and one-click suppression link.
- Disclosure that the review is AI-assisted and human-verified, not a legal certification.

## Subject and tracking rules

- Never use fake `Re:` or `Fwd:` prefixes.
- Never imply the business requested the review or partnered with AccessRevamp.
- Do not attach archives, executables, or unfamiliar code.
- Do not use tracking pixels in the initial workflow.
- Send at most one follow-up, and stop immediately after an objection or opt-out.

## Approval and sending

The backend stores drafts and approved queue items but intentionally does not provide an unattended commercial send loop. A sender may be connected only after legal review, mailbox and DNS authentication, bounce handling, complaint handling, suppression tests, a real postal identity, and a final human approval workflow.

A reply requesting no further contact must be added to `suppression_list` immediately, even when the one-click link was not used.
