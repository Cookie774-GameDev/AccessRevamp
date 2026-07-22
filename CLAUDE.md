# AccessRevamp Claude Code Project Memory

@docs/agent-system/README.md
@docs/agent-system/MAILBOX_MCP.md
@docs/agent-system/mainagent.md
@docs/agent-system/templates/CUSTOMER_FOLDER_TEMPLATE.md

## Current operating task

Maintain and complete the AccessRevamp 100-inbox customer-acquisition and paid-delivery system. The nominal allocation is 100 inboxes × 5 cold + 5 provider-managed warm-up messages per day: 500 cold + 500 provider-managed warm-up = 1,000 total. Capacity metadata never overrides mailbox health, provider rules, suppression, complaints, human approval, or law.

The paid catalog is Homepage Reveal $50, Complete Website Revamp $200, and Cinematic Scroll Site $250. Stripe remains sandbox-only until a real website-originated sandbox Checkout, signed webhook, Supabase fulfillment, Drive ledger entry, and customer workflow are verified end to end.

## Working style

- Do not stop for routine clarification. Make the safest reversible assumption, record it, and continue.
- Ask only when a secret, legal identity, irreversible payment/refund, customer authorization, rights decision, or destructive action cannot be safely inferred.
- Never mix customer context, files, links, prompts, approvals, or messages.
- Never claim a provider action succeeded without a provider result plus matching durable state.
- Keep every artifact below 9,000,000 bytes; split larger outputs and record SHA-256 hashes.
- Preserve existing UI unless the task explicitly requires a UI change.

## Mailbox MCP rules

- Treat the 100-mailbox numbers as capacity, never blanket access.
- Search or read exactly one explicitly authorized mailbox per content tool call.
- Use reply-draft tools only after a user-visible approval; describe the result as a draft.
- Never request `Mail.Send`, deliver a draft, expose credentials, authorize a mailbox, automate warm-up, or perform “Not spam” actions.
- Keep draft and message-state switches false until the pilot mailbox passes provider-scope and audit checks.

## Agent routing

- Customer research, email context, audit, documentation: `docs/agent-system/subagentforcustomer.md`
- Website implementation and visual-match loop: `docs/agent-system/subagentforwebsite.md`
- Homepage, page-reference, poster, and cinematic options: `docs/agent-system/subagentfordesign.md`
- Passive security and authorized active testing: `docs/agent-system/subagentforsecurity.md`
- Stripe, Supabase, Drive, email, creative providers, GitHub, and Netlify: `docs/agent-system/subagentforintegrations.md`

Load the matching `docs/agent-system/skills/*/SKILL.md` before each operation. Use a customer-specific `SKILL.md`, `DESIGN.md`, and durable `/goal` record before implementation. Use separate affirmative portfolio consent and project-specific security authorization. Never automate refunds, warm-up conversations, or “Not spam” actions.

## Completion gate

Completion requires durable Stripe/Supabase reconciliation, correct workflow state, verified external URLs and hashes, successful build/tests, visual/responsive/keyboard/reduced-motion/performance/error-path checks, required human/customer approvals, and an updated delivery manifest. An agent message alone is never proof.
