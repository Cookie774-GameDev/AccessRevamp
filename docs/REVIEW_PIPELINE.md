# Reviewed prospect and Google Drive handoff

This pipeline supports the AccessRevamp sales workflow without turning prospect research into an unattended bulk-mail system.

## Operating stages

1. **Curate:** collect a small set of relevant U.S. storefronts with active products and an intentionally published business contact.
2. **Record provenance:** save the public storefront URL, the public page where the contact address appears, and the exact business address.
3. **Pre-scan:** optionally run `scripts/scan-public-homepage.mjs`. Its output is only a candidate signal.
4. **Human review:** an active `ar_staff` user confirms one finding and records severity, affected users, affected task, evidence, WCAG references when relevant, repair effort, and a proposed fix.
5. **Private concept:** the importer creates an attributed, noindex, 14-day first-screen concept. A standalone concept can instead be created with `scripts/create-private-preview.mjs`.
6. **Import drafts:** `scripts/import-reviewed-prospects.mjs` writes isolated `ar_*` prospect, finding, preview, and draft-outreach records. It sends nothing.
7. **Google Sheets review:** export or mirror draft rows into a private Sheet. Reviewers return approve/reject decisions and copy edits.
8. **Approve:** `scripts/approve-outreach.mjs` rechecks the message, verifies active staff, creates a signed one-click opt-out link, adds the real business identity, and changes only accepted drafts to `approved`.
9. **Export:** `scripts/export-approved-outreach.mjs` exports at most 20 approved rows for a separately configured sender. It sends nothing.
10. **Send and reconcile:** a future sender adapter must recheck suppression immediately before each send, use a reply-capable authenticated mailbox, record provider IDs, and process replies, bounces, complaints, and opt-outs.

## Staff prerequisite

Reviewer and approver fields are Supabase Auth UUIDs, not typed names. After the first owner signs up and confirms the email, add that user to `ar_staff` as documented in `docs/PRIVATE_PREVIEWS.md`. Deactivating a staff row prevents that user from approving new findings, concepts, or outreach.

## Reviewed prospect JSONL

Use one JSON object per line:

```json
{
  "businessName": "Example Store",
  "websiteUrl": "https://store.example",
  "recipientEmail": "hello@store.example",
  "contactSourceUrl": "https://store.example/contact",
  "contactName": "Store team",
  "platform": "shopify",
  "fitReason": "Active U.S. storefront with a public business contact and a verified homepage issue.",
  "fitScore": 82,
  "finding": {
    "category": "accessibility",
    "ruleId": "focus-visible-manual",
    "title": "Primary action has no visible keyboard focus",
    "summary": "Keyboard visitors may lose track of the main shopping action while moving through the first screen.",
    "evidence": "A reviewer tabbed through the public homepage at desktop and mobile widths and confirmed that the focused anchor has no visible indicator.",
    "referenceUrl": "https://store.example",
    "severity": "serious",
    "affectedUsers": "Keyboard and screen-reader users",
    "affectedTask": "Understanding and activating the primary shopping action",
    "wcagCriteria": ["2.4.7 Focus Visible"],
    "repairEffort": "small",
    "suggestedFix": "Add a clearly visible focus indicator with sufficient contrast and preserve it across responsive states.",
    "reviewedByUserId": "00000000-0000-0000-0000-000000000000"
  },
  "preview": {
    "eyebrow": "Made for everyday momentum",
    "headline": "Find the right product without the guesswork.",
    "subheadline": "A clearer hierarchy connects the product promise, one proof point, and one primary shopping action.",
    "primaryCta": "Explore the collection",
    "secondaryCta": "Learn more",
    "proofPoints": [
      "One primary action",
      "Accessible interaction states",
      "Responsive first-screen layout"
    ]
  },
  "subject": "One homepage accessibility observation for Example Store",
  "bodyText": "Hi Example Store team, I reviewed the public homepage at store.example and verified one focus-visibility issue. I also prepared a private first-screen concept: {{PRIVATE_PREVIEW_URL}}. AccessRevamp explains the process at https://YOUR-SITE.netlify.app."
}
```

Run:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
PREVIEW_TOKEN_SECRET='at-least-32-random-characters' \
SITE_URL=https://your-site.netlify.app \
node scripts/import-reviewed-prospects.mjs reviewed-prospects.jsonl
```

The importer:

- refuses empty files or more than 20 rows;
- accepts only public HTTP(S) storefront and contact-source URLs;
- requires a real active staff UUID for the verified finding and approved concept;
- rejects fake `Re:`/`Fwd:` subjects, URL shorteners, invented requests or partnerships, scare claims, legal threats, unsupported revenue claims, and messages that omit the reviewed domain;
- checks both address- and domain-level permanent suppression before creating anything;
- creates a verified finding, approved noindex concept, and **draft** outreach row only;
- prints each private link once and sends no email.

## Human decision JSONL

Approve:

```json
{
  "queueId": "00000000-0000-0000-0000-000000000000",
  "approvedByUserId": "00000000-0000-0000-0000-000000000000",
  "decision": "approve",
  "subject": "Optional corrected subject",
  "bodyText": "Optional corrected body that still mentions store.example and may contain {{OPT_OUT_URL}}.",
  "reviewNotes": "Evidence, recipient relevance, preview, pricing, identity, and wording checked."
}
```

Reject:

```json
{
  "queueId": "00000000-0000-0000-0000-000000000000",
  "approvedByUserId": "00000000-0000-0000-0000-000000000000",
  "decision": "reject",
  "reviewNotes": "Contact is not relevant to this service."
}
```

Run:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
UNSUBSCRIBE_SECRET='a-different-32-character-random-secret' \
SENDER_FULL_NAME='Real person' \
SENDER_EMAIL='reply-capable@example.com' \
BUSINESS_POSTAL_ADDRESS='Valid postal address' \
SITE_URL=https://your-site.netlify.app \
node scripts/approve-outreach.mjs outreach-decisions.jsonl
```

Approval rechecks active staff and message content after all edits. Supabase also enforces the verified-finding/private-preview chain, suppression, one-follow-up ceiling, HTTPS opt-out URL, and maximum of 20 approval transitions per UTC day. Approval still does not send mail.

## Google Drive boundary

The Apps Script review bridge adds review columns to an imported Sheet but has no Gmail permission and no sending function. A backend may read and write structured review data through a narrowly scoped Google Drive integration. Mail delivery remains a separate, auditable adapter after identity, authentication, reply handling, suppression, and final legal review are ready.

## Never import

- passwords, access tokens, private customer data, or non-public contact details;
- a purchased or opaque scraped list with no public source page;
- a scanner signal represented as a verified finding;
- claims of breach, compromise, exploitable vulnerability, legal noncompliance, lawsuit risk, or unsupported revenue outcomes;
- more than 20 records in a batch;
- an address already suppressed or a business that asked not to be contacted.
