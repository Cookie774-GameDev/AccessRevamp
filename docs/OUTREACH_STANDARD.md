# Responsible outreach standard

AccessRevamp has a hard database ceiling of 1,000 first-touch U.S. business messages per UTC day only after every database and human-review gate passes. This is a maximum, not a recommended starting volume; lower mailbox, provider, reputation, legal, and operational limits still apply, and sending remains disabled until launch readiness is approved.

## Allowed source data

Use a business contact address that the business intentionally publishes for relevant inquiries. Record the exact public page where the address appears and the public storefront URL. Do not buy opaque lists, infer private addresses, evade access controls, rotate employees to evade an opt-out, or collect sensitive personal data.

## Claim standard

A scanner signal is a lead, not a customer-facing finding. Outreach may describe one **human-verified accessibility or usability observation** with evidence, the affected user/task, and careful limitations. Use the finding model’s separate labels:

- Severity: `blocking`, `serious`, `moderate`, or `improvement`.
- Confidence: `verified`, `high_confidence_automated`, or `needs_manual_review`.

Only `verified` findings may appear in outreach. Do not describe passive observations as proven security vulnerabilities, compromise, breach, legal noncompliance, a lawsuit threat, or guaranteed financial impact.

## Required message elements

- For first-touch outreach, target 150–185 words and keep the complete customer-visible message at `maximum_message_words: 200` or fewer.
- Cite two or three current, sourced website details from different site areas, and include one restrained overall improvement opportunity.
- Honest sender and business identity.
- Specific reason the message is relevant.
- The public page reviewed and the affected element or task.
- Accurate, restrained, human-approved wording.
- AccessRevamp website URL: `https://accessrevamp.com/`; no URL shortener.
- Concise option descriptions: Homepage Reveal ($50), a focused homepage redesign; Complete Website Revamp ($200), a cohesive refresh across the website; and Cinematic Scroll Site ($250), an immersive scroll-led experience. Explain server-verified cumulative credit separately when applicable.
- Working reply path.
- Valid postal address where required.
- Exact opt-out sentence: Reply “no thanks” and I won’t contact you again. Include a one-click suppression link.
- Natural invitation for questions.
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
