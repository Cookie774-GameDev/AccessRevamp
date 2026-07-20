# Responsible outreach standard

AccessRevamp may approve or send no more than 20 first-touch U.S. business messages per UTC day, and only after every database and human-review gate passes. The approved preparation ramp may produce up to 22 reviewed drafts, but overflow remains unsent until a separately reviewed change replaces the 20-message ceiling. Low volume does not remove commercial-email obligations.

## Allowed source data

Use a business contact address that the business intentionally publishes for relevant inquiries. Record the exact public page where the address appears and the public storefront URL. Do not buy opaque lists, infer private addresses, evade access controls, rotate employees to evade an opt-out, or collect sensitive personal data.

Use a recipient first name only when it is confidently verified from a public business source or prior correspondence. An ambiguous Gmail display name is not enough; use `Hi [Store Name] team,` rather than guessing.

## Claim standard

A scanner signal is a lead, not a customer-facing finding. Outreach may describe one **human-verified accessibility or usability observation** with evidence, the affected user/task, and careful limitations. Use the finding model’s separate labels:

- Severity: `blocking`, `serious`, `moderate`, or `improvement`.
- Confidence: `verified`, `high_confidence_automated`, or `needs_manual_review`.

Only `verified` findings may appear in outreach. Do not describe passive observations as proven security vulnerabilities, compromise, breach, legal noncompliance, a lawsuit threat, or guaranteed financial impact.

## Required message elements

- Honest sender and business identity.
- Specific reason the message is relevant.
- One short, truthful positive detail from the live public site.
- The public page reviewed and the affected element or task.
- Accurate, restrained, human-approved wording.
- The AccessRevamp website address written exactly as `accessrevamp.com` in plain text, without intentional hyperlink formatting.
- No questionnaire, intake, quote-form, checkout, payment, private-preview, tracking, shortened, or personalized sales URL in the first-touch body. A prospect-specific questionnaire may be sent only after a positive reply through the approved reply workflow.
- Exact one-time price when a paid tier is mentioned: **$50**, **$200**, or **$250**, with server-verified cumulative credit explained separately when applicable.
- Working reply path.
- Valid postal address where required.
- Clear opt-out. The sending system may add required `List-Unsubscribe` headers or a legally required compliance footer; these are compliance controls, not sales links.
- Disclosure that the review is AI-assisted and human-verified, not a legal certification.

## Subject and tracking rules

- Never use fake `Re:` or `Fwd:` prefixes.
- Never imply the business requested the review or partnered with AccessRevamp.
- Do not attach archives, executables, or unfamiliar code.
- Do not use tracking pixels in the initial workflow.
- Keep the complete first-touch body, including greeting, signature, postal address, and opt-out, at 125 words or fewer.
- Use a reply-based call to action for a free, no-obligation quote. Do not use “cheap,” “secrets,” “guaranteed,” or fabricated urgency.
- Send at most one follow-up, and stop immediately after an objection or opt-out.

## Approval and sending

The backend stores drafts and approved queue items but intentionally does not provide an unattended commercial send loop. A sender may be connected only after legal review, mailbox and DNS authentication, bounce handling, complaint handling, suppression tests, a real postal identity, and a final human approval workflow.

A reply requesting no further contact must be added to `suppression_list` immediately, even when a one-click link was not used.