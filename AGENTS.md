# AccessRevamp repository contract

## Purpose and customers

AccessRevamp is an evidence-led, one-time website improvement service for small-business owners. The product combines a public marketing site, three original working demonstrations, customer delivery access, operator review tools, private previews, and test-mode payment infrastructure.

Never present sample businesses, observations, reviews, credentials, screenshots, results, or metrics as real customers or outcomes.

## Repository map

- `src/app/`: routing, metadata, lifecycle, and application boundaries.
- `src/components/`: shared semantic UI primitives.
- `src/pages/`: public, customer, operator, policy, and result pages.
- `src/demos/`: route-isolated Greenline, Firejar, and Clearflow mini-apps.
- `src/services/`: browser-side same-origin clients and progressive enhancement.
- `netlify/functions/`: server-authoritative validation and orchestration.
- `supabase/migrations/`: forward-only schema, RLS, grants, and database functions.
- `tests/`: unit, contract, integration, browser, accessibility, and policy checks.
- `scripts/`: safe local build, evidence, export, and verification tools.
- `tools/mailbox-mcp/`: local, audited Microsoft mailbox reads and reply-draft controls.
- `docs/`: product, architecture, operations, evidence, plans, and handoff records.

## Supported stack

- Node.js 22.12 or newer.
- Vite 8 and native ES modules.
- Netlify Functions.
- Supabase Auth/Postgres/RLS.
- Stripe Checkout in test mode until separately approved for launch.
- Node test runner, Playwright, axe-core, and Lighthouse.

Do not migrate frameworks, add a CMS, component framework, or WebGL dependency, switch infrastructure, or make an irreversible data change without an approved ADR.

## Commands

```text
npm install
npm run dev
npm test
npm run lint
npm run build
npm run check
npm run baseline
npm run mailbox:mcp:doctor
npm audit --omit=dev --audit-level=high
```

Run the smallest relevant test first, observe it fail for the intended reason, implement, rerun it, then run `npm run check`. Keep commits small and independently reviewable.

## Browser verification

Required browsers are Chromium, Firefox, and WebKit. Required viewports are 1440×900, 1280×800, 1024×768, 768×1024, 390×844, and 375×667, plus 320-pixel reflow and 200% zoom. Verify keyboard, touch, reduced motion, forced colors, slow network, media failure, direct routes, history, console, and network behavior.

## Migrations and data

- Migrations are forward-only, reviewable, and applied to local/nonproduction Supabase before any production consideration.
- Preserve RLS. Add browser policies only for required customer access.
- Use a fixed safe `search_path` for security-definer functions and revoke public execution.
- Keep prospects, finding evidence, preview internals, suppression, outreach, Stripe events, reservations, refund dependencies, and operational audit service/operator-only.
- Never rewrite or delete user data to make a migration appear successful.

## Environment categories

Document names only, never values:

- public site URL and public contact address;
- Supabase project URL and publishable browser key;
- Supabase server URL and service-role credential;
- Stripe test secret, webhook secret, expected mode, and server-only Price IDs;
- operator allowlist/claim configuration;
- preview signing/hash configuration;
- Microsoft Graph tenant, application, and certificate identifiers for the local mailbox MCP;
- optional Icemail inventory API access, kept server-side and disabled by default;
- authorized staging URL and explicit active-testing switch;
- optional consented analytics transport.

Never put secrets or Stripe Price IDs in `VITE_*`, Git, browser bundles, logs, screenshots, prompts, prospect records, Google Drive/Sheets, or public assets.

## Style and content

- Follow root `design.md` and `docs/DESIGN.md`.
- Use focused modules with one responsibility and route-scoped cleanup.
- Prefer semantic HTML and native controls.
- Use factual, cautious copy. Distinguish evidence, inference, recommendation, concept, and implementation.
- Every portfolio demonstration must say exactly: “Original working demo — not a client engagement.”
- No fake clients, logos, ratings, scarcity, revenue, conversions, vulnerabilities, compliance, or authorization.

## Accessibility

WCAG 2.2 AA is the target, never a certification claim. The complete product must remain useful with keyboard-only use, assistive technology, reduced motion, delayed JavaScript, failed media, 200% zoom, 320-pixel reflow, and slow mobile networks. Use visible focus, labels, instructions, error summaries, live status, landmarks, and correct heading order.

## Payments and entitlements

- Canonical prices are Free Snapshot $0, Homepage Reveal $50, Complete Website Revamp $200, and Cinematic Scroll Site $250, all one time.
- Verified upgrade paths are $50→$200 for $150, $50→$250 for $200, and $200→$250 for $50.
- The browser sends only target tier and random request ID. The server verifies confirmed identity, locks entitlement credit, calculates due amount, selects the exact server-only test Price ID, and creates a reservation.
- Webhooks—not redirect pages—grant or change entitlements.
- Full and partial refunds must recompute effective paid value and record dependent-upgrade review.
- Never switch Stripe live mode or create a live transaction without separate explicit approval.

## Security and authorization

The browser is not an authorization boundary. Enforce identity, ownership, operator access, amount, credit, preview state, suppression, and workflow transitions on the server and in RLS. Validate method, origin, content type, size, schema, token, and target. Redact errors and logs. Active security/load testing is allowed only against an owned, explicitly authorized nonproduction target—never a prospect.

## Outreach and suppression

Required order: Research → Evidence → Human review → Private preview → Human approval → Suppression check → Queue → Send.

`sending_enabled` remains `false`. Do not add a mail transport during the rebuild. The local mailbox MCP may use Microsoft Graph `Mail.ReadWrite` for one-mailbox reads and editable drafts only; it must never request `Mail.Send`, expose credentials, deliver drafts, authorize mailboxes, or automate warm-up. Stop on opt-out, hard bounce, complaint, negative response, exhausted lawful follow-up, or no response. Passive public review only; active prospect testing requires exact written authorization.

## Definition of done

Completion requires direct evidence for every item in `C:\Users\viper\Downloads\Your prompt.txt`: required routes, exact catalog/upgrade arithmetic, migrations/RLS, Stripe test-mode matrix, refunds, account/operator/preview/outreach flows, three complete demos, report/PNG workflow, cinematic fallback, accessibility, browsers, performance, authorized security/load results, secret scan, documentation, deployment, and rollback. Missing or indirect evidence is incomplete—not passed.

## Authoritative links

- Product design: `docs/superpowers/specs/2026-07-18-accessrevamp-production-rebuild-design.md`
- Execution plans: `docs/superpowers/plans/2026-07-18-accessrevamp-*.md`
- Product: `docs/PRODUCT.md`
- Architecture: `docs/ARCHITECTURE.md`
- Design system: `docs/DESIGN.md`
- Payments and entitlements: `docs/PAYMENTS.md`
- Data model: `docs/DATA_MODEL.md`
- Current status: `docs/IMPLEMENTATION_STATUS.md`
- Security: `docs/SECURITY.md`
- Outreach: `docs/OUTREACH.md`
- Mailbox MCP: `docs/agent-system/MAILBOX_MCP.md`
- Quality: `docs/QUALITY.md`
- Deployment: `docs/DEPLOYMENT.md`
- Third parties and provenance: `docs/THIRD_PARTY.md`
