# Responsible outreach standard

AccessRevamp may approve at most 20 first-touch or follow-up business messages per UTC day, and only after every database and human-review gate passes. Approval does not send mail.

## Allowed source data

Use a business contact address that the business intentionally publishes for relevant inquiries. Record the public page where the address appears and the reviewed storefront URL. Start with U.S. businesses. Do not buy opaque lists, infer private addresses, evade access controls, collect sensitive personal data, or contact another employee to bypass an opt-out.

## Review boundary

The scanner may inspect ordinary public homepage responses and produce candidate evidence. It must not log in, submit forms, enter checkout, use credentials, scan private routes, probe infrastructure, exploit a weakness, or represent an automated signal as verified.

Every prospect-facing observation needs:

- a specific public URL;
- evidence that a person checked;
- severity and confidence labels;
- the affected user group and business task;
- a WCAG reference when relevant;
- an estimated repair effort and suggested fix;
- an active `ar_staff` reviewer UUID.

Use **severity**, not “security,” when describing accessibility impact. A passive technical signal is not proof of a vulnerability. Do not imply compromise, breach, legal noncompliance, lawsuit risk, or guaranteed financial impact.

## Required message elements

- Honest real-person sender and AccessRevamp identity.
- Specific reason the message is relevant.
- The reviewed public business domain.
- Accurate, restrained, evidence-backed wording.
- The AccessRevamp website URL.
- Exact one-time price when a paid plan is mentioned: $50 or $199.
- Clear statement that a private concept is not the live website.
- Reply-capable mailbox and valid postal address.
- Commercial-outreach identification.
- Clear opt-out wording and a signed one-click suppression link.

## Prohibited message patterns

- Fake `Re:` or `Fwd:` subjects.
- URL shorteners.
- Claims that the recipient requested the review or partnered with AccessRevamp.
- Legal threats, “noncompliant” declarations, or lawsuit language.
- Unsupported security-vulnerability, breach, compromise, lost-revenue, or guaranteed-result claims.
- Attachments containing unfamiliar archives or executable code.
- More than one follow-up.
- Contacting another person at the company after an objection or opt-out.

The importer and approval script reject several of these patterns automatically, but the person approving the message remains responsible for context and accuracy.

## Approval and sending

A draft can move to `approved` only when:

- the recipient matches the prospect's listed public business email;
- neither the address nor domain is suppressed;
- the prospect is a human-verified U.S. prospect;
- a verified finding and unexpired noindex concept are attributed to active staff;
- an active staff member approves the exact final subject and body;
- the body includes an HTTPS opt-out link and opt-out language;
- the UTC-day approval count remains below 20.

The repository stores drafts and approved records but contains no unattended commercial sender. A sender may be connected only after final legal review, a real reply-capable mailbox, SPF/DKIM/DMARC, bounce and complaint handling, reply reconciliation, and a last suppression check immediately before every send.

A reply requesting no further contact must be inserted into `public.ar_suppression_list` immediately, even when the signed one-click link was not used. The related draft or sent record should be marked `opted_out` or `suppressed`, and no employee at that business should be contacted to evade the request.
