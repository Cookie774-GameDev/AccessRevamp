-- Close two workflow-integrity gaps found during review:
-- 1. optional revision tasks must not block the normal no-revision path;
-- 2. private approval links may select only the option group and revision round
--    they were issued for.

alter table public.project_approval_links
  add column if not exists allowed_option_groups text[] not null default '{}',
  add column if not exists revision_round_scope smallint;

alter table public.project_approval_links
  drop constraint if exists project_approval_links_allowed_option_groups_check;
alter table public.project_approval_links
  add constraint project_approval_links_allowed_option_groups_check
  check (allowed_option_groups <@ array[
    'homepage_normal',
    'homepage_cinematic',
    'cinematic_sequence',
    'cinematic_scene',
    'page_reference',
    'poster_still',
    'poster_animated',
    'business_card',
    'brochure'
  ]::text[]);

alter table public.project_approval_links
  drop constraint if exists project_approval_links_revision_round_scope_check;
alter table public.project_approval_links
  add constraint project_approval_links_revision_round_scope_check
  check (revision_round_scope is null or revision_round_scope between 0 and 2);

-- Existing links are currently unused, but backfill deterministically so a replay
-- or restored environment cannot expose every option on the project.
update public.project_approval_links l
set allowed_option_groups = case l.purpose
      when 'homepage_selection' then array['homepage_normal','homepage_cinematic']::text[]
      when 'revision_selection' then array['homepage_normal','homepage_cinematic']::text[]
      when 'cinematic_sequence_selection' then array['cinematic_sequence']::text[]
      when 'scene_selection' then array['cinematic_scene']::text[]
      else '{}'::text[]
    end,
    revision_round_scope = case
      when l.purpose = 'revision_selection' then coalesce((
        select case t.task_key
          when 'optional_revision_round_one' then 1
          when 'optional_revision_round_two' then 2
          else t.revision_round
        end
        from public.project_workflow_tasks t
        where t.id = l.task_id
      ), 0)
      when l.purpose in ('homepage_selection','cinematic_sequence_selection','scene_selection') then 0
      else null
    end,
    updated_at = timezone('utc', now());

create or replace function public.advance_accessrevamp_workflow(p_workflow_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_task public.project_workflow_tasks%rowtype;
  v_required_remaining integer;
  v_required_failed integer;
  v_active_optional integer;
  v_next_status text;
begin
  select count(*) into v_required_failed
  from public.project_workflow_tasks
  where workflow_id = p_workflow_id
    and required
    and status = 'failed';

  if v_required_failed > 0 then
    update public.project_workflows
       set status = 'blocked', updated_at = timezone('utc', now())
     where id = p_workflow_id;
    return 'blocked';
  end if;

  select count(*) into v_required_remaining
  from public.project_workflow_tasks
  where workflow_id = p_workflow_id
    and required
    and status not in ('succeeded','skipped','canceled');

  select count(*) into v_active_optional
  from public.project_workflow_tasks
  where workflow_id = p_workflow_id
    and not required
    and status in ('queued','running','waiting_customer','waiting_integration');

  if v_required_remaining = 0 and v_active_optional = 0 then
    update public.project_workflow_tasks
       set status = 'skipped',
           completed_at = coalesce(completed_at, timezone('utc', now())),
           output_payload = case
             when output_payload = '{}'::jsonb then jsonb_build_object('reason','optional task was not activated')
             else output_payload
           end,
           updated_at = timezone('utc', now())
     where workflow_id = p_workflow_id
       and not required
       and status = 'blocked';

    update public.project_workflows
       set status = 'completed',
           completed_at = coalesce(completed_at, timezone('utc', now())),
           updated_at = timezone('utc', now())
     where id = p_workflow_id;
    return 'completed';
  end if;

  select * into v_task
  from public.project_workflow_tasks
  where workflow_id = p_workflow_id
    and status not in ('succeeded','skipped','canceled')
    and (
      required
      or status in ('queued','running','waiting_customer','waiting_integration')
    )
  order by sequence_number, created_at
  limit 1
  for update;

  if not found then return 'idle'; end if;

  if v_task.status = 'blocked' then
    v_next_status := case v_task.activation_mode
      when 'automatic' then 'queued'
      when 'customer' then 'waiting_customer'
      when 'integration' then 'waiting_integration'
      else 'blocked'
    end;
    update public.project_workflow_tasks
       set status = v_next_status, updated_at = timezone('utc', now())
     where id = v_task.id;
  else
    v_next_status := v_task.status;
  end if;

  update public.project_workflows
     set status = case
                    when v_next_status = 'waiting_customer' then 'waiting_customer'
                    when v_next_status = 'waiting_integration' then 'waiting_integration'
                    when v_next_status = 'failed' then 'blocked'
                    else 'running'
                  end,
         current_stage = v_task.stage,
         started_at = coalesce(started_at, timezone('utc', now())),
         updated_at = timezone('utc', now())
   where id = p_workflow_id;

  return v_next_status;
end;
$$;

create or replace function public.submit_accessrevamp_project_approval(
  p_token_hash text,
  p_selected_option_ids uuid[] default '{}',
  p_customer_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_link public.project_approval_links%rowtype;
  v_existing public.project_approval_selections%rowtype;
  v_expected_count integer;
  v_matching_count integer;
  v_selection_id uuid;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Approval token is invalid';
  end if;
  if coalesce(array_length(p_selected_option_ids, 1), 0) > 20 then
    raise exception using errcode = '22023', message = 'Too many approval options were submitted';
  end if;
  if char_length(coalesce(p_customer_notes, '')) > 2000 then
    raise exception using errcode = '22023', message = 'Approval notes are too long';
  end if;

  select * into v_link
  from public.project_approval_links
  where token_hash = p_token_hash
  for update;

  if not found then raise exception using errcode = 'P0002', message = 'Approval link was not found'; end if;

  if v_link.status = 'used' then
    select * into v_existing
    from public.project_approval_selections
    where approval_link_id = v_link.id;
    if found and v_existing.selected_option_ids = coalesce(p_selected_option_ids, '{}') then
      return jsonb_build_object(
        'ok',true,
        'duplicate',true,
        'project_id',v_link.project_id,
        'purpose',v_link.purpose,
        'selection_id',v_existing.id
      );
    end if;
    raise exception using errcode = '55000', message = 'Approval link has already been used';
  end if;

  if v_link.status <> 'active' then raise exception using errcode = '55000', message = 'Approval link is not active'; end if;
  if v_link.expires_at <= timezone('utc', now()) then
    update public.project_approval_links
       set status = 'expired', updated_at = timezone('utc', now())
     where id = v_link.id;
    raise exception using errcode = '55000', message = 'Approval link has expired';
  end if;

  v_expected_count := case
    when v_link.purpose in ('homepage_selection','revision_selection','cinematic_sequence_selection','scene_selection') then 1
    else 0
  end;

  if coalesce(array_length(p_selected_option_ids, 1), 0) <> v_expected_count then
    raise exception using errcode = '22023', message = 'Choose the required number of options';
  end if;

  if v_expected_count > 0 then
    if cardinality(v_link.allowed_option_groups) = 0 then
      raise exception using errcode = '55000', message = 'Approval option scope is not configured';
    end if;

    select count(*) into v_matching_count
    from public.project_design_options o
    where o.project_id = v_link.project_id
      and o.id = any(p_selected_option_ids)
      and o.status in ('customer_ready','selected')
      and o.option_group = any(v_link.allowed_option_groups)
      and (v_link.revision_round_scope is null or o.revision_round = v_link.revision_round_scope);

    if v_matching_count <> v_expected_count then
      raise exception using errcode = '22023', message = 'Selected option is outside this approval link scope';
    end if;
  end if;

  insert into public.project_approval_selections (
    approval_link_id,
    project_id,
    selected_option_ids,
    customer_notes
  ) values (
    v_link.id,
    v_link.project_id,
    coalesce(p_selected_option_ids, '{}'),
    nullif(btrim(coalesce(p_customer_notes, '')), '')
  )
  returning id into v_selection_id;

  if v_expected_count > 0 then
    update public.project_design_options o
       set status = 'selected',
           customer_selected_at = timezone('utc', now()),
           updated_at = timezone('utc', now())
     where o.project_id = v_link.project_id
       and o.id = any(p_selected_option_ids)
       and o.option_group = any(v_link.allowed_option_groups)
       and (v_link.revision_round_scope is null or o.revision_round = v_link.revision_round_scope);
  end if;

  update public.project_approval_links
     set status = 'used', used_at = timezone('utc', now()), updated_at = timezone('utc', now())
   where id = v_link.id;

  if v_link.task_id is not null then
    perform public.complete_accessrevamp_workflow_task(
      v_link.task_id,
      true,
      jsonb_build_object(
        'approval_link_id',v_link.id,
        'selection_id',v_selection_id,
        'selected_option_ids',coalesce(p_selected_option_ids,'{}'),
        'allowed_option_groups',v_link.allowed_option_groups,
        'revision_round_scope',v_link.revision_round_scope
      ),
      null
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'duplicate',false,
    'project_id',v_link.project_id,
    'purpose',v_link.purpose,
    'selection_id',v_selection_id
  );
end;
$$;

revoke all on function public.advance_accessrevamp_workflow(uuid) from public, anon, authenticated;
revoke all on function public.submit_accessrevamp_project_approval(text, uuid[], text) from public, anon, authenticated;
grant execute on function public.advance_accessrevamp_workflow(uuid) to service_role;
grant execute on function public.submit_accessrevamp_project_approval(text, uuid[], text) to service_role;

comment on function public.advance_accessrevamp_workflow(uuid) is
  'Advances required work and explicitly activated optional work. Unactivated optional tasks cannot block completion.';
comment on function public.submit_accessrevamp_project_approval(text, uuid[], text) is
  'Consumes one hashed approval link and accepts only project options inside its purpose and revision scope.';
