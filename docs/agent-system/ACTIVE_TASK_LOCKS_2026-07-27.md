# Active task locks — 2026-07-27

Parent session: current AccessRevamp end-to-end recovery and Homepage Reveal evaluation test.

| Task ID | Owner | Write scope | Exclusions | Status |
| --- | --- | --- | --- | --- |
| AR-FIX-FEEDBACK-20260727 | Feedback worker | `netlify/functions/account-project-feedback.mjs`, `src/services/customer-workspace-renderer.js`, `tests/customer-dashboard-feedback.test.mjs`, one new migration prefixed `2026072801` | Approval, workflow-template, auth, payment, and unrelated files | Locked |
| AR-FIX-APPROVAL-20260727 | Approval worker | `tests/creative-review-command-center.test.mjs`, `tests/creative-asset-fidelity.test.mjs`, one new migration prefixed `2026072802` | Feedback, UI, workflow-template, auth, payment, and unrelated files | Locked |
| AR-FIX-HOMEPAGE-WORKFLOW-20260727 | Workflow worker | `tests/customer-workflow-orchestration.test.mjs`, `tests/customer-agent-handoff-gate.test.mjs`, one new migration prefixed `2026072803`, directly relevant agent-system docs | Feedback, UI, approval, auth, payment, and unrelated files | Locked |
| AR-URBEAUTY-CONCEPTS-20260727 | Design worker | `docs/evidence/urbeauty-vipersel2-evaluation/**` only | Application source, database, migrations, customer data, email, deployment, and unrelated evidence | Locked |

All assignments are concurrent. Workers must preserve unrelated dirty work, stop on scope conflict, and hand off exact test evidence. The parent independently reviews and verifies every material claim.
