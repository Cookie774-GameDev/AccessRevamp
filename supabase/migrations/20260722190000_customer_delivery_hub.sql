begin;

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  title text not null,
  body text not null default '',
  stage text,
  progress_percent smallint,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_updates_title_check check (char_length(title) between 1 and 160),
  constraint project_updates_body_check check (char_length(body) <= 6000),
  constraint project_updates_stage_check check (stage is null or char_length(stage) between 1 and 120),
  constraint project_updates_progress_check check (progress_percent is null or progress_percent between 0 and 100)
);

create index if not exists project_updates_project_published_idx
  on public.project_updates (project_id, published_at desc, created_at desc);

create index if not exists project_artifacts_customer_visible_idx
  on public.project_artifacts (project_id, status, created_at desc)
  where status in ('approved', 'delivered');

create index if not exists project_design_options_customer_visible_idx
  on public.project_design_options (project_id, status, created_at desc)
  where status in ('customer_ready', 'selected', 'delivered');

alter table public.project_updates enable row level security;

drop policy if exists project_updates_select_own_published on public.project_updates;
create policy project_updates_select_own_published
  on public.project_updates
  for select
  to authenticated
  using (
    published_at is not null
    and exists (
      select 1
      from public.customer_projects project
      where project.id = project_updates.project_id
        and project.user_id = (select auth.uid())
    )
  );

drop policy if exists project_updates_deny_browser_mutation on public.project_updates;
create policy project_updates_deny_browser_mutation
  on public.project_updates
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.project_updates from public, anon, authenticated;
grant select on table public.project_updates to authenticated;
grant all on table public.project_updates to service_role;

drop trigger if exists set_project_updates_updated_at on public.project_updates;
create trigger set_project_updates_updated_at
before update on public.project_updates
for each row execute function public.set_accessrevamp_updated_at();

alter table public.project_artifacts
  drop constraint if exists project_artifacts_size_bytes_check;

alter table public.project_artifacts
  add constraint project_artifacts_size_bytes_check
  check (size_bytes is null or (size_bytes >= 0 and size_bytes <= 52428800))
  not valid;

alter table public.project_artifacts
  validate constraint project_artifacts_size_bytes_check;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'customer-project-artifacts',
  'customer-project-artifacts',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/json',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
    'video/mp4',
    'video/webm'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.operator_publish_project_update(
  p_project_id uuid,
  p_title text,
  p_body text,
  p_stage text default null,
  p_progress_percent smallint default null,
  p_project_status text default null,
  p_delivery_status text default null,
  p_delivery_due_at timestamptz default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_update_id uuid;
  v_now timestamptz := timezone('utc', now());
begin
  perform 1
  from public.customer_projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'Project not found.' using errcode = 'P0002';
  end if;

  insert into public.project_updates (
    project_id,
    title,
    body,
    stage,
    progress_percent,
    created_by,
    published_at
  )
  values (
    p_project_id,
    btrim(p_title),
    coalesce(btrim(p_body), ''),
    nullif(btrim(p_stage), ''),
    p_progress_percent,
    p_created_by,
    v_now
  )
  returning id into v_update_id;

  update public.customer_projects
  set status = coalesce(p_project_status, status),
      delivery_status = coalesce(p_delivery_status, delivery_status),
      delivery_due_at = coalesce(p_delivery_due_at, delivery_due_at),
      delivered_at = case
        when p_delivery_status = 'delivered' then coalesce(delivered_at, v_now)
        when p_delivery_status is not null then null
        else delivered_at
      end,
      updated_at = v_now
  where id = p_project_id;

  return v_update_id;
end;
$$;

create or replace function public.operator_finalize_project_artifact(
  p_artifact_id uuid,
  p_created_by uuid,
  p_mark_delivered boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_artifact public.project_artifacts%rowtype;
  v_project public.customer_projects%rowtype;
  v_update_id uuid;
  v_delivery_id uuid;
  v_delivery_version smallint;
  v_now timestamptz := timezone('utc', now());
  v_next_status text := case when p_mark_delivered then 'delivered' else 'approved' end;
  v_title text;
  v_body text;
begin
  select * into v_artifact
  from public.project_artifacts
  where id = p_artifact_id
  for update;

  if not found then
    raise exception 'Artifact not found.' using errcode = 'P0002';
  end if;

  if v_artifact.status <> 'draft' or v_artifact.storage_path is null then
    raise exception 'Artifact cannot be finalized.' using errcode = '55000';
  end if;

  select * into v_project
  from public.customer_projects
  where id = v_artifact.project_id
  for update;

  if not found then
    raise exception 'Project not found.' using errcode = 'P0002';
  end if;

  v_title := left(coalesce(nullif(v_artifact.metadata ->> 'title', ''), v_artifact.filename, 'New project file'), 160);
  v_body := left(coalesce(nullif(v_artifact.metadata ->> 'description', ''),
    coalesce(v_artifact.filename, 'A new file') || ' is now available in your customer hub.'), 6000);

  update public.project_artifacts
  set status = v_next_status,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'customer_visible', true,
        'published_at', v_now,
        'finalized_by', p_created_by
      ),
      updated_at = v_now
  where id = v_artifact.id;

  insert into public.project_updates (
    project_id,
    title,
    body,
    stage,
    progress_percent,
    created_by,
    published_at
  )
  values (
    v_project.id,
    case when p_mark_delivered then 'Your website package is ready' else v_title end,
    v_body,
    case when p_mark_delivered then 'delivery' else 'customer_review' end,
    case when p_mark_delivered then 100 else null end,
    p_created_by,
    v_now
  )
  returning id into v_update_id;

  if p_mark_delivered then
    update public.customer_projects
    set status = 'completed',
        delivery_status = 'delivered',
        delivered_at = v_now,
        updated_at = v_now
    where id = v_project.id;

    select (coalesce(max(version), 0) + 1)::smallint
    into v_delivery_version
    from public.project_deliveries
    where project_id = v_project.id
      and delivery_type = 'final_package';

    if v_delivery_version > 100 then
      raise exception 'Delivery version limit reached.' using errcode = '22023';
    end if;

    insert into public.project_deliveries (
      project_id,
      version,
      delivery_type,
      status,
      manifest,
      customer_notified_at,
      delivered_at
    )
    values (
      v_project.id,
      v_delivery_version,
      'final_package',
      'sent',
      jsonb_build_object('artifact_ids', jsonb_build_array(v_artifact.id)),
      v_now,
      v_now
    )
    returning id into v_delivery_id;
  end if;

  return jsonb_build_object(
    'artifact_id', v_artifact.id,
    'status', v_next_status,
    'update_id', v_update_id,
    'delivery_id', v_delivery_id
  );
end;
$$;

revoke all on function public.operator_publish_project_update(uuid, text, text, text, smallint, text, text, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.operator_publish_project_update(uuid, text, text, text, smallint, text, text, timestamptz, uuid)
  to service_role;

revoke all on function public.operator_finalize_project_artifact(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.operator_finalize_project_artifact(uuid, uuid, boolean)
  to service_role;

comment on table public.project_updates is
  'Customer-visible project timeline entries. Browser roles can read only published rows for projects they own; service-role operator APIs publish changes.';

comment on function public.operator_finalize_project_artifact(uuid, uuid, boolean) is
  'Atomically publishes one verified private artifact, creates a customer update, and optionally records final delivery.';

commit;
