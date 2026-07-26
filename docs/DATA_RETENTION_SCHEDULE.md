# AccessRevamp Data Retention Schedule

**Status:** Draft for owner and qualified legal/tax review  
**Created:** 2026-07-26  
**Scope:** AccessRevamp storefront, customer hub, support, project delivery, outreach suppression, Supabase records, Stripe metadata, and operational logs.

## What data retention means

Data retention defines how long AccessRevamp keeps each kind of customer or operational information, why it is kept, and when it is deleted or anonymized. The goal is to keep information only as long as it is needed for delivery, security, accounting, dispute handling, or honoring an opt-out.

## Proposed schedule

| Data category | Proposed retention period | End-of-period action |
| --- | --- | --- |
| Unpaid order drafts and abandoned intake uploads | 30 days after last activity | Delete the draft and associated uploads |
| Active customer profile and project workspace | While the account or project is active | Keep only fields needed for service delivery and account access |
| Completed project source files and deliverables | 24 months after final delivery | Delete or anonymize unless the customer requests earlier deletion or continued storage is agreed |
| Support conversations and ordinary customer correspondence | 12 months after the thread closes | Delete or anonymize nonessential content |
| Outreach research and prospect records | 12 months after last contact | Delete or anonymize, except the minimum suppression record |
| Opt-out and suppression records | As long as needed to prevent renewed contact | Retain only the minimum identifier, opt-out date, and source needed to honor the request |
| Security, authentication, and operational audit logs | 12 months | Delete or aggregate unless needed for an active investigation |
| Payment, invoice, tax, refund, and accounting records | 7 years after the transaction | Delete when the applicable legal/accounting period ends |
| Failed webhook and queue diagnostic payloads | 30 days after resolution | Delete after redacting any evidence needed for a longer-lived audit record |
| Backups | According to the hosting/database backup lifecycle, with a target maximum of 35 days | Allow backup copies to expire automatically; do not restore deleted data except for disaster recovery |

## Deletion and account requests

- Verify the requester before exposing, exporting, correcting, or deleting account data.
- Complete ordinary deletion requests within 30 days when practical.
- Remove nonessential personal data while retaining only records required for payment, tax, fraud prevention, security, dispute handling, and suppression.
- Deletion from active systems does not instantly remove data from time-limited backups. Backup copies expire through the normal backup lifecycle.
- Record the request, verification result, systems affected, completion date, and any narrowly retained records.

## Safeguards

- Store secrets only in approved secret stores, never in Markdown, browser-visible data, logs, or customer dashboards.
- Keep Stripe payment credentials and full card data out of AccessRevamp systems; retain only provider identifiers and necessary transaction metadata.
- Limit customer project access by authenticated user and project ownership.
- Keep suppression records separate from reusable outreach lists.
- Review this schedule at least annually and whenever a provider, law, service scope, or business location materially changes.

## Approval boundary

This schedule is an operational draft. The owner must confirm the periods, and a qualified legal or tax professional should confirm any jurisdiction-specific obligations before `data_retention_verified_at` is marked complete in production readiness.
