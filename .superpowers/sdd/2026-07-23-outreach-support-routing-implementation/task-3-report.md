# Task 3 Report — 200-word first-touch ceiling

## Completed scope

- Added forward-only migration `20260723090000_raise_first_touch_word_limit.sql`.
- Raised the outreach-setting default and singleton value to 200, with `sending_enabled` inserted as `false` only for a new singleton.
- Updated the settings and cold-message constraints to a hard 200-word maximum.
- Replaced the queue trigger with the existing fail-closed guards intact and a `least(v_settings.maximum_message_words, 200)` ceiling.
- Added migration-contract coverage and updated the orchestration contract to the approved 200-word ceiling.

## TDD evidence

1. Added the migration-contract tests before the migration existed.
2. Ran `node --test tests/outreach-message-limit.test.mjs tests/customer-agent-orchestration.test.mjs` and observed the expected `ENOENT` failure for the missing migration.
3. Added the forward-only migration, then corrected the migration to target only the old 175-word cold-message constraint instead of an unnamed constraint that could have protected human approval.
4. Ran the required focused suite successfully.

## Verification

`node --test tests/outreach-message-limit.test.mjs tests/customer-agent-orchestration.test.mjs tests/database-guardrails.test.mjs`

Result: 15 passed, 0 failed.

## Safety boundaries retained

The migration was not applied to Supabase. It does not enable sending, add a mail transport, or modify mailing-address behavior. The trigger retains sender identity, source verification, suppression, human approval, disabled-sending, authorized-mailbox capacity, daily locking, and 30-day spacing gates. Function execution remains service-role-only with a fixed `pg_catalog` search path.
