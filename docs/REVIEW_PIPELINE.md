# Reviewed prospect and Google Drive handoff

This pipeline supports the AccessRevamp sales workflow without turning prospect research into an unattended bulk-mail system.

## Stages

1. **Curate:** collect a small set of relevant U.S. storefronts with active products and an intentionally published business contact.
2. **Record provenance:** save the public storefront URL, the public page where the contact address appears, and the exact address.
3. **Pre-scan:** optionally run `scripts/scan-public-homepage.mjs`. Its output remains a candidate signal.
4. **Human review:** confirm one accessibility or usability finding and record severity, affected users, affected task, evidence, WCAG reference when relevant, repair effort, and proposed fix.
5. **Private concept:** create a reviewed, expiring preview with `scripts/create-private-preview.mjs` when the prospect is strong enough to justify it.
6. **Import drafts:** run `scripts/import-reviewed-prospects.mjs`. It writes prospects, verified findings, structured evidence, and outreach drafts to Supabase. It sends nothing.
7. **Google Sheets review:** export or mirror draft rows into a private Sheet. Reviewers return approve/reject decisions and copy edits.
8. **Approve:** run `scripts/approve-outreach.mjs`. It verifies sender settings, inserts the real opt-out link, adds business identity, and changes only approved drafts to `approved`.
9. **Export:** run `scripts/export-approved-outreach.mjs` for a separately configured sender. The export is limited to 20 rows and sends nothing.
10. **Send and reconcile:** a future sender adapter must check suppression immediately before each send, respect the daily reservation, record provider IDs, and process replies, bounces, complaints, and opt-outs.

## Reviewed prospect JSONL

One JSON object per line:

```json
{
  "businessName": "Example Store",
  "websiteUrl": "https://store.example",
  "recipientEmail": "hello@store.example",
  "contactSourceUrl": "https://store.example/contact",
  "finding": {
    "category": "accessibility",
    "severity": "serious",
    "affectedUserGroup": "Keyboard and screen-reader users",
    "affectedBusinessTask": "Understanding and activating the primary shopping action",
    "title": "Primary action has no visible keyboard focus",
    "summary": "Keyboard visitors may lose track of the main shopping action while moving through the first screen.",
    "evidence": "A reviewer tabbed through the public homepage at desktop and mobile widths and confirmed that the focused anchor has no visible indicator.",
    "referenceUrl": "https://store.example",
    "ruleId": "focus-visible-manual",
    "domSelector": "main .hero a.primary",
    "htmlExcerpt": "<a class=\"primary\" href=\"/collections/all\">Shop now</a>",
    "wcagReference": "WCAG 2.2 SC 2.4.7 Focus Visible",
    "screenshotPath": "evidence/example-store/focus.png",
    "repairEffort": "small",
    "proposedFix": "Add a clearly visible focus indicator with sufficient contrast and preserve it across responsive states.",
    "reviewedBy": "Reviewer name"
  },
  "subject": "One homepage accessibility observation for Example Store",
  "bodyText": "Hi Example Store team, I reviewed the public homepage at store.example and verified ... I also prepared a private concept: https://YOUR-SITE.netlify.app/preview/TOKEN ... AccessRevamp: https://YOUR-SITE.netlify.app ... {{OPT_OUT_URL}}"
}
```

Run:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/import-reviewed-prospects.mjs reviewed-prospects.jsonl
```

The importer:

- refuses more than 20 rows;
- rejects fake `Re:`/`Fwd:` subjects, common URL shorteners, and scare claims;
- requires the reviewed domain to appear in the message body;
- skips addresses already on the permanent suppression list;
- accepts only human-verified findings using the structured finding model;
- creates drafts only.

## Human decision JSONL

Approve:

```json
{
  "queueId": "00000000-0000-0000-0000-000000000000",
  "approvedBy": "Reviewer name",
  "decision": "approve",
  "subject": "Optional corrected subject",
  "bodyText": "Optional corrected body containing {{OPT_OUT_URL}}",
  "reviewNotes": "Evidence, recipient relevance, preview, pricing, identity, and wording checked."
}
```

Reject:

```json
{
  "queueId": "00000000-0000-0000-0000-000000000000",
  "approvedBy": "Reviewer name",
  "decision": "reject",
  "reviewNotes": "Contact is not relevant to this service."
}
```

Run:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/approve-outreach.mjs outreach-decisions.jsonl
```

Before approval succeeds, `outreach_settings` must contain a real sender name, reply-capable email, postal address, and deployed AccessRevamp site URL. Approval still does not send mail.

## Google Drive boundary

The Apps Script review bridge adds review columns to an imported Sheet but has no Gmail permission and no sending function. A backend may read and write structured review data through a narrowly scoped Google Drive integration. Mail delivery remains a separate, auditable adapter after identity, authentication, reply handling, suppression, and final legal review are ready.

## Never import

- passwords, access tokens, private customer data, or non-public contact details;
- a purchased or opaque scraped list with no public source page;
- a scanner signal represented as a verified finding;
- claims of breach, compromise, exploitable vulnerability, legal noncompliance, lawsuit risk, or unsupported revenue outcomes;
- more than 20 records in a batch;
- an address already suppressed or a business that asked not to be contacted.
