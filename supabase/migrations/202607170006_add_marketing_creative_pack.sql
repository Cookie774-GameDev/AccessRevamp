-- Track the AI-assisted, human-reviewed marketing creative pack included in
-- the $199 Quick Fix Plan. Browser customers may read only their own project
-- creatives. All writes remain server-side.

alter table public.customer_projects
  add column if not exists creative_pack_status text not null default 'not_applicable',
  add column if not exists creative_pack_due_at timestamptz,
  add column if not exists creative_pack_delivered_at timestamptz;

alter table public.customer_projects drop constraint if exists customer_projects_creative_pack_status_check;
alter table public.customer_projects
  add constraint customer_projects_creative_pack_status_check
  check (creative_pack_status in (
    'not_applicable',
    'waiting_for_inputs',
    'master_directions',
    'customer_review',
    'format_adaptation',
    'human_review',
    'delivered',
    'paused',
    'canceled'
  ));

update public.customer_projects
   set creative_pack_status = case
     when plan_key = 'quick_fix' and creative_pack_status = 'not_applicable' then 'waiting_for_inputs'
     when plan_key = 'homepage_reveal' then 'not_applicable'
     else creative_pack_status
   end;

create table if not exists public.marketing_creatives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  creative_number smallint not null check (creative_number between 1 and 10),
  master_direction smallint not null check (master_direction between 1 and 2),
  format_key text not null check (format_key in (
    'square_1080x1080',
    'portrait_1080x1350',
    'story_1080x1920',
    'landscape_1200x628',
    'poster_letter_a4'
  )),
  campaign_offer text not null,
  headline text,
  supporting_copy text,
  caption text,
  call_to_action text,
  recommended_channel text,
  canva_url text,
  export_url text,
  ai_assisted boolean not null default true,
  rights_review_status text not null default 'needs_review' check (rights_review_status in (
    'needs_review',
    'approved_client_assets',
    'approved_free_assets',
    'rejected'
  )),
  status text not null default 'draft' check (status in (
    'draft',
    'human_review',
    'customer_review',
    'approved',
    'delivered',
    'rejected'
  )),
  human_approved_by text,
  human_approved_at timestamptz,
  customer_approved_at timestamptz,
  delivered_at timestamptz,
  revision_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, creative_number),
  constraint marketing_creatives_urls_check check (
    (canva_url is null or canva_url ~* '^https://')
    and (export_url is null or export_url ~* '^https://')
  ),
  constraint marketing_creatives_approval_check check (
    status not in ('approved', 'delivered')
    or (human_approved_by is not null and human_approved_at is not null)
  ),
  constraint marketing_creatives_delivery_check check (
    status <> 'delivered' or delivered_at is not null
  )
);

create index if not exists marketing_creatives_project_status_idx
  on public.marketing_creatives (project_id, status, creative_number);

create index if not exists customer_projects_creative_pack_status_idx
  on public.customer_projects (creative_pack_status, creative_pack_due_at);

alter table public.marketing_creatives enable row level security;

revoke all on table public.marketing_creatives from public, anon, authenticated;
grant all on table public.marketing_creatives to service_role;
grant select on table public.marketing_creatives to authenticated;

create policy marketing_creatives_select_own
  on public.marketing_creatives
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.customer_projects
       where customer_projects.id = marketing_creatives.project_id
         and customer_projects.user_id = (select auth.uid())
    )
  );

create or replace function public.enforce_accessrevamp_marketing_creative()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan_key text;
begin
  select customer_projects.plan_key
    into v_plan_key
    from public.customer_projects
   where customer_projects.id = new.project_id;

  if not found then
    raise exception 'AccessRevamp project not found';
  end if;

  if v_plan_key <> 'quick_fix' then
    raise exception 'Marketing creative pack is available only for Quick Fix Plan projects';
  end if;

  if new.status in ('approved', 'delivered') and new.rights_review_status not in ('approved_client_assets', 'approved_free_assets') then
    raise exception 'Creative asset rights must be reviewed before approval or delivery';
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.enforce_accessrevamp_marketing_creative() from public, anon, authenticated;
grant execute on function public.enforce_accessrevamp_marketing_creative() to service_role;

drop trigger if exists enforce_accessrevamp_marketing_creative_trigger on public.marketing_creatives;
create trigger enforce_accessrevamp_marketing_creative_trigger
before insert or update on public.marketing_creatives
for each row execute function public.enforce_accessrevamp_marketing_creative();

comment on table public.marketing_creatives is
  'Ten Canva-ready Quick Fix marketing creative variations: two master directions adapted into five standard formats. AI-assisted; human and rights review required before delivery.';

comment on column public.customer_projects.creative_pack_status is
  'Tracks the one-campaign, ten-variation marketing creative pack included only with the $199 Quick Fix Plan.';
