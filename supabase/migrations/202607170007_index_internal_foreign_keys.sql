-- Cover foreign keys used by the internal outreach and audit workflows.
-- These indexes improve joins and parent-row updates/deletes as records grow.

create index if not exists outreach_queue_prospect_created_idx
  on public.outreach_queue (prospect_id, created_at desc);

create index if not exists accessrevamp_audit_log_actor_created_idx
  on public.accessrevamp_audit_log (actor_id, created_at desc);
