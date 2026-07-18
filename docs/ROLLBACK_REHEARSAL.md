# Rollback rehearsal

Status: implementation complete; external nonproduction rehearsal pending an approved environment.

1. Record the feature commit, immutable preview deploy ID, migration history, and environment-variable revision without recording values.
2. Build and serve the previous known-good commit in a temporary worktree. Do not reset the active worktree.
3. Restore the feature tip and confirm the same primary-route smoke checks.
4. For application or asset regressions, select the last known-good immutable deploy and retain the failing deploy for evidence.
5. Database changes use a reviewed forward-recovery migration or a confirmed backup restore decision; destructive down migrations are not assumed safe.
6. Payment rollback disables new checkout creation while preserving webhook reconciliation, settled orders, and audit records.
7. Outreach rollback keeps sending disabled, stops queued records, preserves suppression, and revokes private previews where appropriate.

Exit evidence includes decision owner, timestamps, old/new deploy references, database compatibility decision, smoke results, and any remaining data written during the incident window.
