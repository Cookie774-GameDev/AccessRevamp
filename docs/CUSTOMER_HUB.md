# Customer hub and private delivery workflow

## Customer experience

Customers create or sign in to a confirmed Supabase email account and land at `/account/projects`. The hub assembles only projects owned by that authenticated user and shows:

- project status, percentage, due date, and customer-visible updates;
- the submitted project brief, reference URLs, and private reference images;
- approved design directions and published workflow steps;
- approved reports, media, ZIP website packages, and final deliveries;
- verified order and refund records.

Private file links are generated on demand and expire after 15 minutes. Raw storage paths, service-role credentials, internal task payloads, and unpublished artifacts are never returned to the browser.

## Operator workflow

An active `accessrevamp_operators` user opens `/operator` and can publish a timeline update or a project file.

1. The operator API validates the project, file metadata, MIME type, and size.
2. It creates a draft artifact and a path-scoped Supabase signed upload token.
3. The browser uploads the bytes directly to the private `customer-project-artifacts` bucket.
4. The operator API verifies that the object exists and matches the expected size.
5. A service-role-only database function atomically publishes the artifact and customer update. Final packages also close the project and create a delivery record.

This avoids proxying large files through Netlify Functions and prevents a partial database delivery if publication fails.

## Capacity boundaries

The design has no per-customer infrastructure and scales horizontally across the existing Netlify and Supabase services, but it is still governed by the quotas of the selected provider plans. Storage should be monitored, old draft uploads should be cleaned up, and paid capacity should be added before any provider limit affects customers.

The private artifact bucket accepts approved image, video, PDF, text, JSON, and ZIP formats up to 50 MiB per file. Website source deliveries should be packaged as a ZIP and must not contain credentials, private keys, `.env` files, customer secrets, or production database exports.
