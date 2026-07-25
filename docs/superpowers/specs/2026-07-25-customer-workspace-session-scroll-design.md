# Customer workspace, persistent session, and smooth showcase design

## Outcome

AccessRevamp customers receive an application-style private workspace instead of a marketing-page-like dashboard. A verified session survives ordinary browser restarts and navigation until the customer explicitly signs out, clears browser data, or the server revokes or expires the session. Three cinematic comparison chapters respond quickly to scrolling without jumping directly to large video offsets.

## Customer navigation and session behavior

- Supabase remains the session authority with `persistSession`, automatic token refresh, and verified server-side session checks.
- Visiting sign-in or sign-up while already authenticated redirects to `/account/projects`; it never signs out an existing session.
- Explicit logout remains the only application action that deliberately clears the local session.
- The public header displays `Sign in` while signed out and an accessible profile control while signed in.
- The profile control opens `/account/projects`; the workspace contains account identity and logout controls.
- Authentication state changes update the header without a page refresh.

## Workspace information architecture

The customer hub uses a restrained dark application shell:

- a compact workspace header for account identity and top-level actions;
- a left project rail listing one entry per paid project;
- a focused project canvas showing only the selected project;
- status, progress, next action, and delivery timing at the top;
- separate workspace sections for the brief/questions, progress tasks, design choices, special requests, files, and updates;
- account and order records in a secondary account panel.

Stripe fulfillment remains authoritative for project creation. A successful, signature-verified paid checkout creates or updates exactly one `customer_projects` row for its order. The UI never creates a paid project from browser claims or redirect parameters.

Project selection is represented by a safe project identifier in the URL query string. The client accepts only identifiers present in the authenticated API response and otherwise selects the newest project.

## Account integrity

- Email addresses are normalized to lowercase before account creation.
- Supabase Auth and the profile email index prevent duplicate email identities.
- Existing confirmed accounts route to sign-in.
- Existing unconfirmed accounts receive only a new confirmation path and do not create another identity.
- Full name, email, password, confirmation code, and all request shapes remain validated on both client and server.
- Customer APIs continue to validate the Supabase user and the application verification ceremony.

## Scroll behavior

Each of the three comparison chapters keeps an immediate scroll target and a separately rendered progress value.

- Scroll input updates the target in one animation frame.
- Rendered progress approaches the target with time-based exponential interpolation.
- Large deltas receive a faster response while still crossing intermediate frames.
- Video seeks are coalesced so a decoder completes or times out before the newest target is applied.
- The visual progress indicator follows rendered progress, not raw scroll position.
- Direct range and touch scrubbing remain immediate because the user is manipulating the timeline explicitly.
- Reduced-motion mode keeps a non-sticky, direct presentation.

## Payment and security verification

- The runtime remains explicitly configured for Stripe live mode.
- Checkout health requires deployed live-key bindings, a six-price live catalog, a recent verified configuration, and signed webhook liveness.
- Database production-readiness triggers are not bypassed.
- External operational approvals—legal, tax, business identity, backup restoration, incident response, accessibility, data retention, and Supabase plan features—remain truthful blockers until evidenced.
- Protected customer resources stay ownership-scoped and private.

## Verification

- Regression tests cover session preservation, authenticated header state, duplicate-account handling, selected-project isolation, project creation from payment fulfillment, and smoothed scroll interpolation.
- Existing authentication, customer hub, payment, security, and responsive tests continue to pass.
- Production build, local secret scan, dependency audit, live authentication checks, protected API checks, Stripe payment health, webhook state, and Supabase advisors are rerun before completion.
