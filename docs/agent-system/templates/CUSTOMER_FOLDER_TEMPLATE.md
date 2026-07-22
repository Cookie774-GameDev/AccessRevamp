# Customer Folder Template

Create one isolated folder per paid customer project. Use a neutral name such as `<project-id> — <business-name>` and never place secrets in filenames or documents.

## Folder structure

```text
01 Payment and Identity/
  PAYMENT_RECORD.md
  CUSTOMER_PROFILE.md
02 Research and Audit/
  WEBSITE_RESEARCH.md
  AUDIT_REPORT.md
  SECURITY_REVIEW.md
  GROWTH_AND_MONETIZATION.md
03 Design Options/
  SKILL.md
  DESIGN.md
  APPROVALS.md
  homepage-options/
  cinematic-sequences/
  page-references/
04 Website Build/
  LINKS.md
  TEST_REPORT.md
  DEPLOYMENT_MANIFEST.md
05 Creative Pack/
  animated-posters/
  still-posters/
  CREATIVE_MANIFEST.md
06 Delivery/
  DELIVERY_MANIFEST.md
  CUSTOMER_MESSAGE.md
```

## `PAYMENT_RECORD.md`

Record non-secret Stripe and Supabase identifiers: order ID, request ID, project ID, Checkout Session ID, PaymentIntent ID, Stripe event ID, plan, amount, currency, payment mode, verification time, entitlement status, workflow ID, and ledger row. Never store keys, card data, or raw webhook payloads in Drive.

## `CUSTOMER_PROFILE.md`

Record confirmed name, business, website, email, plan, products/services, approved instructions, content/media rights, scene count, revision limit, portfolio permission, and important unknowns.

## `APPROVALS.md`

Record purpose, approval-link ID—not raw token—expiry, selected option IDs, customer notes, revision round, consent scope, and submission time.

## File limit

No file may exceed 9,000,000 bytes. Split larger items into `part-001`, `part-002`, and so on. Record filename, size, MIME type, and SHA-256 in the corresponding manifest.

## Authority

Stripe and Supabase remain authoritative for payment and workflow state. Google Drive is a customer-workspace and reconciliation copy, not the payment database.
