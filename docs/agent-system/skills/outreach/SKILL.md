# Skill: Evidence-Based Outreach and Replies

## Goal

Prepare restrained, relevant, human-approved business messages based on current, sourced public-site observations while preserving suppression, sender identity, mailbox health, and legal requirements.

## Volume math

The database value of 1,000 is a hard technical ceiling, not an instruction to send regardless of mailbox health. The operating cap is the lower of:

- The configured database ceiling.
- The number of active, authorized mailboxes multiplied by the cold-email limit per mailbox.
- Provider, reputation, legal, complaint, and operator limits.

With 100 inboxes, AccessRevamp may send at most five cold-or-reply messages per mailbox per America/Chicago day: 500 combined at full verified capacity. Icemail-managed warm-up is a separate provider feature and is outside this agent skill. The queue may operate only when the selected mailboxes are registered, active, healthy, and authorized.

## Message rules

- First-touch outreach must target 150–185 words. The complete customer-visible message has `maximum_message_words: 200` as its hard maximum.
- Review the recipient’s public website immediately before drafting.
- Cite two or three current, sourced website details from different site areas, such as the homepage, services, pricing, about, contact, or a conversion page. Record each source URL and retrieval time.
- Include one restrained overall improvement opportunity; do not present it as a guaranteed result, legal finding, or security conclusion.
- State the honest sender and AccessRevamp identity.
- Explain why the message is relevant without fear, legal threats, or promised results.
- Describe the available options concisely: Homepage Reveal ($50): a focused homepage redesign; Complete Website Revamp ($200): a cohesive refresh across the website; Cinematic Scroll Site ($250): an immersive, scroll-led experience.
- Include `https://accessrevamp.com/` without a URL shortener.
- Include a working reply path, valid postal identity where required, and a clear opt-out.
- Use this exact opt-out sentence: Reply “no thanks” and I won’t contact you again.
- End naturally: “If you have questions, feel free to ask.”

## Prohibited practices

Do not use “do not reply” as an opt-out. Do not automate “Not spam,” warm-up interactions, fake replies, fake `Re:`/`Fwd:`, tracking pixels, address guessing, employee rotation to evade opt-outs, bought opaque lists, misleading headers, or unattended bulk sending.

## Required gates

Public contact source recorded; prospect approved; finding human-verified; sender settings complete; exact message human-approved; recipient not suppressed; recipient not contacted in prior 30 days; mailbox active and authorized; global sending switch enabled only after launch review; bounce and complaint handling operational.

## Output

A draft or approved queue item only. This skill does not provide a transport. Every send result, reply, opt-out, bounce, and complaint must be reconciled into the message and suppression records.
