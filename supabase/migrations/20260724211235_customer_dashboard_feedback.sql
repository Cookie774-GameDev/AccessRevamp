create table if not exists public.customer_project_feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  action text not null check (action in ('select_designs', 'request_more', 'special_request')),
  option_group text,
  selected_option_ids uuid[] not null default '{}',
  notes text,
  revision_round smallint not null default 0 check (revision_round between 0 and 2),
  request_more_count smallint,
  status text not null default 'pending' check (status in ('pending', 'acknowledged', 'in_progress', 'completed', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, request_id),
  constraint customer_project_feedback_notes_check check (notes is null or char_length(notes) between 1 and 3000),
  constraint customer_project_feedback_option_count_check check (cardinality(selected_option_ids) <= 3),
  constraint customer_project_feedback_request_more_count_check check (request_more_count is null or request_more_count between 1 and 2)
);

create index if not exists customer_project_feedback_project_created_idx
  on public.customer_project_feedback (project_id, created_at desc);

alter table public.customer_project_feedback enable row level security;

drop policy if exists customer_project_feedback_select_own on public.customer_project_feedback;
create policy customer_project_feedback_select_own
  on public.customer_project_feedback
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and accessrevamp_private.accessrevamp_session_is_verified()
  );

revoke all on table public.customer_project_feedback from public, anon, authenticated;
grant select on table public.customer_project_feedback to authenticated;
grant all on table public.customer_project_feedback to service_role;

create or replace function accessrevamp_private.submit_accessrevamp_dashboard_feedback(
  p_project_id uuid,
  p_request_id uuid,
  p_action text,
  p_option_group text default null,
  p_selected_option_ids uuid[] default '{}',
  p_notes text default null,
  p_revision_round smallint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, accessrevamp_private
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.customer_projects%rowtype;
  v_existing public.customer_project_feedback%rowtype;
  v_selected uuid[] := coalesce(p_selected_option_ids, '{}');
  v_matching integer;
  request_more_count integer;
  v_feedback_id uuid;
begin
  if v_user_id is null or not accessrevamp_private.accessrevamp_session_is_verified() then
    raise exception 'Verified authentication required.' using errcode = '28000';
  end if;

  if p_request_id is null or p_project_id is null then
    raise exception 'Feedback request is invalid.' using errcode = '22023';
  end if;

  select * into v_existing
  from public.customer_project_feedback
  where user_id = v_user_id and request_id = p_request_id;
  if found then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'feedback_id', v_existing.id,
      'request_more_count', v_existing.request_more_count
    );
  end if;

  select * into v_project
  from public.customer_projects project
  where project.id = p_project_id
  for update;

  if not found or v_project.user_id <> v_user_id then
    raise exception 'Project is unavailable.' using errcode = '28000';
  end if;

  if p_action = 'select_designs' then
    if p_option_group is null
      or cardinality(v_selected) < 1
      or cardinality(v_selected) > 3
      or cardinality(v_selected) <> (
        select count(distinct selected_id)
        from unnest(v_selected) selected_id
      ) then
      raise exception 'Choose one to three unique design options.' using errcode = '22023';
    end if;

    select count(*)::integer into v_matching
    from public.project_design_options option
    where option.project_id = p_project_id
      and option.id = any(v_selected)
      and option.option_group = p_option_group
      and option.revision_round = p_revision_round
      and option.status in ('customer_ready', 'selected');

    if v_matching <> cardinality(v_selected) then
      raise exception 'One or more design options are unavailable.' using errcode = '22023';
    end if;

    update public.project_design_options
    set status = case when id = v_selected[1] then 'selected' else status end,
        customer_selected_at = case when id = v_selected[1] then timezone('utc', now()) else customer_selected_at end,
        updated_at = timezone('utc', now())
    where project_id = p_project_id and id = any(v_selected);
  elsif p_action = 'request_more' then
    select count(*)::integer into request_more_count
    from public.customer_project_feedback
    where project_id = p_project_id
      and user_id = v_user_id
      and action = 'request_more'
      and status <> 'rejected';

    if request_more_count >= 2 then
      raise exception 'The two additional design rounds have already been requested.' using errcode = '22023';
    end if;
    request_more_count := request_more_count + 1;
    v_selected := '{}';
  elsif p_action = 'special_request' then
    if char_length(btrim(coalesce(p_notes, ''))) < 10 then
      raise exception 'Add a little more detail to the request.' using errcode = '22023';
    end if;
    v_selected := '{}';
  else
    raise exception 'Feedback action is invalid.' using errcode = '22023';
  end if;

  insert into public.customer_project_feedback (
    project_id,
    user_id,
    request_id,
    action,
    option_group,
    selected_option_ids,
    notes,
    revision_round,
    request_more_count
  ) values (
    p_project_id,
    v_user_id,
    p_request_id,
    p_action,
    nullif(btrim(coalesce(p_option_group, '')), ''),
    v_selected,
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_revision_round,
    case when p_action = 'request_more' then request_more_count else null end
  )
  returning id into v_feedback_id;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'feedback_id', v_feedback_id,
    'request_more_count', case when p_action = 'request_more' then request_more_count else null end
  );
end;
$$;

revoke all on function accessrevamp_private.submit_accessrevamp_dashboard_feedback(
  uuid, uuid, text, text, uuid[], text, smallint
) from public, anon, authenticated;
grant execute on function accessrevamp_private.submit_accessrevamp_dashboard_feedback(
  uuid, uuid, text, text, uuid[], text, smallint
) to authenticated;

create or replace function public.submit_accessrevamp_dashboard_feedback(
  p_project_id uuid,
  p_request_id uuid,
  p_action text,
  p_option_group text default null,
  p_selected_option_ids uuid[] default '{}',
  p_notes text default null,
  p_revision_round smallint default 0
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, accessrevamp_private
as $$
  select accessrevamp_private.submit_accessrevamp_dashboard_feedback(
    p_project_id,
    p_request_id,
    p_action,
    p_option_group,
    p_selected_option_ids,
    p_notes,
    p_revision_round
  );
$$;

revoke all on function public.submit_accessrevamp_dashboard_feedback(
  uuid, uuid, text, text, uuid[], text, smallint
) from public, anon, authenticated;
grant execute on function public.submit_accessrevamp_dashboard_feedback(
  uuid, uuid, text, text, uuid[], text, smallint
) to authenticated;
