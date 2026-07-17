# Reviewed prospect and Google Drive handoff

This pipeline supports the workflow described in the AccessRevamp blueprint without turning prospect research into an unattended bulk-mail system.

## Stages

1. **Curate:** collect no more than 20 relevant public storefronts for a review batch.
2. **Record provenance:** save the public storefront URL, the public page where the business contact address appears, and the exact contact address.
3. **Review:** a human or review backend records one evidence-backed observation. Candidate automated signals are not customer-facing findings.
4. **Import drafts:** run `scripts/import-reviewed-prospects.mjs`. This writes prospects, verified findings, and outreach drafts to Supabase. It sends nothing.
5. **Google Sheets review:** export or mirror the draft rows into a private Google Sheet. Reviewers return an approve/reject decision and any copy edits.
6. **Approve:** run `scripts/approve-outreach.mjs`. It verifies sender settings, inserts the real permanent opt-out link, adds business identity, and changes only approved drafts to `approved`.
7. **Export:** run `scripts/export-approved-outreach.mjs` for the separately configured sender. The export is limited to 20 rows and does not send mail.
8. **Send and reconcile:** a future sender adapter must check the suppression list again immediately before each send, record provider IDs, process bounces/complaints, and never exceed the database-enforced daily ceiling.

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
    "title": "Primary action has insufficient visible focus",
    "summary": "Keyboard visitors may lose track of the primary shopping action when moving through the first screen.",
    "evidence": "Human review confirmed that the focused anchor has no visible outline at desktop and mobile widths.",
    "referenceUrl": "https://store.example",
    "reviewedBy": "Reviewer name"
  },
  "subject": "A specific homepage observation for Example Store",
  "bodyText": "Hi Example Store team, ... Include the AccessRevamp site URL and {{OPT_OUT_URL}} before approval."
}
```

Run:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
node scripts/import-reviewed-prospects.mjs reviewed-prospects.jsonl
```

The importer refuses more than 20 rows, skips addresses already on the permanent suppression list, and produces drafts only.

## Human decision JSONL

```json
{
  "queueId": "00000000-0000-0000-0000-000000000000",
  "approvedBy": "Reviewer name",
  "decision": "approve",
  "subject": "Optional corrected subject",
  "bodyText": "Optional corrected body containing {{OPT_OUT_URL}}",
  "reviewNotes": "Evidence and wording checked."
}
```

Reject instead:

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

Before an approval can succeed, the singleton `outreach_settings` record must contain a real sender name, reply-capable email, postal address, and deployed AccessRevamp site URL. Approval still does not send mail.

## Google Drive boundary

The provided Apps Script adds review columns to an imported Sheet but has no Gmail permissions and no sending function. A backend may read and write structured review data through a properly scoped Google Drive integration, but mail sending should remain a separate, auditable adapter after the business identity and opt-out process are ready.

## Never import

- passwords, access tokens, private customer data, or non-public contact details;
- a claim of breach, compromise, or exploitable vulnerability based only on an automated signal;
- a purchased or scraped list with no public source page;
- more than 20 records in a batch;
- an address already suppressed or a business that has asked not to be contacted.
