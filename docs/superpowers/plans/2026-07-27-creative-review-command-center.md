# Creative Review Command Center Implementation Plan

1. Add contract tests for version lineage, append-only feedback/events,
   operator-only APIs, separate delivery approval, durable revision routing,
   complete-address validation, responsive UI, and agent prompt requirements.
2. Add a forward-only Supabase migration for review fields, feedback/events,
   indexes, RLS, grants, triggers, and atomic operator RPCs.
3. Extend the operator server endpoint to load review workspaces and handle
   critique, design approval, delivery approval, and trusted version
   registration with strict validation and idempotency.
4. Extend `/operator` with the private creative-review interface and responsive,
   keyboard-accessible styling.
5. Add a trusted QA seed script that renders a homepage with exact source
   assets, registers V1, processes critique, registers V2, and never authorizes
   delivery.
6. Update the main, customer, design, website, integration, security, delivery,
   design-brief, and template documents with the command-center and richer brand
   evidence contract.
7. Apply the migration, run targeted and full verification, execute the
   authenticated browser loop, verify no customer delivery, commit, push, and
   verify the Cloudflare production deployment.

