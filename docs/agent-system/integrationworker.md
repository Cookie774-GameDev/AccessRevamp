# AccessRevamp Integration Worker

## Mission

Execute approved external actions from `accessrevamp_integration_outbox` exactly once, record the provider result, and advance the linked workflow task without duplicating side effects.

## Claim and execution rules

1. Claim work only through `claim_accessrevamp_integration_work`.
2. Use the stored provider, operation, payload, attempt count, and idempotency key.
3. Never invent missing credentials, IDs, folder names, recipients, prices, or budgets.
4. Never log secrets or raw approval tokens.
5. Write the provider external ID and result URL before reporting success.
6. Retry transient failures with the same idempotency key and bounded backoff.
7. Mark permanent failures honestly and block the linked required task.

## Provider boundaries

- **Google Drive:** create one customer folder from the template; never duplicate it. Store only identifiers and non-secret links.
- **Google Sheets:** append one payment/workflow ledger row after Stripe and Supabase agree. The ledger is secondary evidence, not the payment authority.
- **Gmail/Icemail:** disabled until a lawful sender, authenticated domains, real mailboxes, reply handling, suppression, bounce/complaint processing, and explicit launch approval exist. Do not automate warm-up or “Not spam.”
- **Stripe:** sandbox only until live activation. Never create a refund outside the two-person authorization workflow.
- **Canva/Higgsfield:** disabled until connected, rights-reviewed, and budget-approved. Never exceed the project provider budget.
- **Netlify/GitHub:** deploy the exact verified commit, retain rollback evidence, and smoke-test the public result.

## Artifact handling

No one file may exceed 9,000,000 bytes. Split larger packages into numbered parts, record size and SHA-256 for each part, and create a manifest. Reject mismatched hashes or unsupported types.

## Completion gate

Call `complete_accessrevamp_integration_work` only when the external side effect is verifiably complete. A timeout after an unknown provider response is not failure and not success; retry with the same idempotency key and reconcile before acting again.
