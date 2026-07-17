-- Complete the evidence model used by AccessRevamp reviews and add isolated,
-- expiring private concept previews. Browser roles receive no direct access.

alter table public.findings
  add column if not exists severity text,
  add column if not exists confidence text not null default 'needs_manual_review',
  add column if not exists affected_user_group text,
  add column if not exists affected_business_task text,
  add column if not exists rule_id text,
  add column if not exists dom_selector text,
  add column if not exists html_excerpt text,
  add column if not exists wcag_reference text,
  add column if not exists screenshot_path text,
  add column if not exists automated_confidence numeric(4,3),
  add column if not exists repair_effort text,
  add column if not exists proposed_fix text,
  add column if not exists retest_result text;

update public.findings
   set category = 'technical_quality'
 where category = 'security_hygiene';

update public.findings
   set confidence = 'verified'
 where status = 'verified'
   and confidence = 'needs_manual_review';

alter table public.findings drop constraint if exists findings_category_check;
alter table public.findings
  add constraint findings_category_check
  check (category in ('accessibility','usability','performance','content','seo','technical_quality','conversion'));

alter table public.findings drop constraint if exists findings_severity_check;
alter table public.findings
  add constraint findings_severity_check
  check (severity is null or severity in ('blocking','serious','moderate','improvement'));

alter table public.findings drop constraint if exists findings_confidence_check;
alter table public.findings
  add constraint findings_confidence_check
  check (confidence in ('verified','high_confidence_automated','needs_manual_review'));

alter table public.findings drop constraint if exists findings_automated_confidence_check;
alter table public.findings
  add constraint findings_automated_confidence_check
  check (automated_confidence is null or automated_confidence between 0 and 1);

alter table public.findings drop constraint if exists findings_repair_effort_check;
alter table public.findings
  add constraint findings_repair_effort_check
  check (repair_effort is null or repair_effort in ('small','medium','large','unknown'));

alter table public.findings drop constraint if exists findings_verified_confidence_check;
alter table public.findings
  add constraint findings_verified_confidence_check
  check (status <> 'verified' or confidence = 'verified');

create table if not exists public.finding_evidence (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.findings(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('screenshot','dom_excerpt','computed_value','manual_note','retest')),
  source_url text,
  storage_path text,
  dom_selector text,
  html_excerpt text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  constraint finding_evidence_location_check check (source_url is null or source_url ~* '^https?://')
);
create index if not exists finding_evidence_finding_idx on public.finding_evidence (finding_id, created_at);

create table if not exists public.previews (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete set null,
  token_hash text not null unique,
  source_url text not null,
  concept_payload jsonb not null check (jsonb_typeof(concept_payload) = 'object'),
  status text not null default 'draft' check (status in ('draft','active','expired','revoked')),
  human_approved_by text,
  human_approved_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint previews_token_hash_check check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint previews_source_url_check check (source_url ~* '^https?://'),
  constraint previews_active_review_check check (
    status <> 'active' or (human_approved_by is not null and human_approved_at is not null)
  )
);
create index if not exists previews_status_expiry_idx on public.previews (status, expires_at);
create index if not exists previews_prospect_created_idx on public.previews (prospect_id, created_at desc);

alter table public.finding_evidence enable row level security;
alter table public.previews enable row level security;

revoke all on table public.finding_evidence, public.previews from public, anon, authenticated;
grant all on table public.finding_evidence, public.previews to service_role;

revoke all on table public.findings from anon;
grant select on public.findings to authenticated;
-- Existing RLS still prevents authenticated customers from seeing prospect findings.
-- Service operations use the server-only service_role client.

create or replace function public.expire_accessrevamp_previews()
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  update public.previews
     set status = 'expired',
         updated_at = timezone('utc', now())
   where status = 'active'
     and expires_at <= timezone('utc', now());
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_accessrevamp_previews() from public, anon, authenticated;
grant execute on function public.expire_accessrevamp_previews() to service_role;

-- Re-create safely if this migration is replayed in a development database.
drop trigger if exists previews_accessrevamp_updated_at on public.previews;
create trigger previews_accessrevamp_updated_at
before update on public.previews
for each row execute function public.set_accessrevamp_updated_at();

comment on table public.finding_evidence is
  'Structured evidence for candidate and verified AccessRevamp findings. Never exposed directly to public browser roles.';
comment on table public.previews is
  'Human-approved, randomized, expiring private concept previews. Raw access tokens are never stored.';
comment on function public.expire_accessrevamp_previews() is
  'Marks active AccessRevamp previews expired after their configured expiration time; service_role only.';
