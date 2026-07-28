begin;

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
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.customer_projects%rowtype;
  v_existing public.customer_project_feedback%rowtype;
  v_selected uuid[] := pg_catalog.coalesce(p_selected_option_ids, '{}');
  v_matching integer;
  v_request_more_count integer;
  v_feedback_id uuid;
begin
  if v_user_id is null
    or not accessrevamp_private.accessrevamp_session_is_verified() then
    raise exception 'Verified authentication required.' using errcode = '28000';
  end if;

  if p_request_id is null or p_project_id is null then
    raise exception 'Feedback request is invalid.' using errcode = '22023';
  end if;

  select *
  into v_project
  from public.customer_projects project
  where project.id = p_project_id
  for update;

  if not found or v_project.user_id <> v_user_id then
    raise exception 'Project is unavailable.' using errcode = '28000';
  end if;

  select *
  into v_existing
  from public.customer_project_feedback feedback
  where feedback.user_id = v_user_id
    and feedback.request_id = p_request_id;

  if found then
    if v_existing.project_id <> p_project_id
      or v_existing.action <> p_action
      or pg_catalog.coalesce(v_existing.option_group, '')
        <> pg_catalog.btrim(pg_catalog.coalesce(p_option_group, ''))
      or v_existing.selected_option_ids <> v_selected
      or v_existing.revision_round <> p_revision_round
      or pg_catalog.coalesce(v_existing.notes, '')
        <> pg_catalog.btrim(pg_catalog.coalesce(p_notes, '')) then
      raise exception 'Feedback request id is already in use.'
        using errcode = '22023';
    end if;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'feedback_id', v_existing.id,
      'request_more_count', v_existing.request_more_count
    );
  end if;

  if p_action = 'select_designs' then
    if p_option_group is null
      or p_option_group <> 'homepage'
      or pg_catalog.cardinality(v_selected) < 1
      or pg_catalog.cardinality(v_selected) > 3
      or pg_catalog.cardinality(v_selected) <> (
        select pg_catalog.count(distinct selected_id)
        from pg_catalog.unnest(v_selected) selected_id
      ) then
      raise exception 'Choose one to three unique homepage options.'
        using errcode = '22023';
    end if;

    select pg_catalog.count(*)::integer
    into v_matching
    from public.project_design_options option
    where option.project_id = p_project_id
      and option.id = any(v_selected)
      and option.option_group in (
        'homepage_normal',
        'homepage_cinematic'
      )
      and option.revision_round = p_revision_round
      and option.status in ('customer_ready', 'selected');

    if v_matching <> pg_catalog.cardinality(v_selected) then
      raise exception 'One or more homepage options are unavailable.'
        using errcode = '22023';
    end if;

    update public.project_design_options
    set status = case when id = v_selected[1] then 'selected' else status end,
        customer_selected_at = case
          when id = v_selected[1]
            then pg_catalog.timezone('utc', pg_catalog.now())
          else customer_selected_at
        end,
        updated_at = pg_catalog.timezone('utc', pg_catalog.now())
    where project_id = p_project_id
      and id = any(v_selected);
  elsif p_action = 'request_more' then
    select pg_catalog.count(*)::integer
    into v_request_more_count
    from public.customer_project_feedback feedback
    where feedback.project_id = p_project_id
      and feedback.user_id = v_user_id
      and feedback.action = 'request_more'
      and feedback.status <> 'rejected';

    if v_request_more_count >= 2 then
      raise exception 'The two additional design rounds have already been requested.'
        using errcode = '22023';
    end if;
    v_request_more_count := v_request_more_count + 1;
    v_selected := '{}';
  elsif p_action = 'special_request' then
    if pg_catalog.char_length(
      pg_catalog.btrim(pg_catalog.coalesce(p_notes, ''))
    ) < 10 then
      raise exception 'Add a little more detail to the request.'
        using errcode = '22023';
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
    pg_catalog.nullif(
      pg_catalog.btrim(pg_catalog.coalesce(p_option_group, '')),
      ''
    ),
    v_selected,
    pg_catalog.nullif(
      pg_catalog.btrim(pg_catalog.coalesce(p_notes, '')),
      ''
    ),
    p_revision_round,
    case
      when p_action = 'request_more' then v_request_more_count
      else null
    end
  )
  returning id into v_feedback_id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'feedback_id', v_feedback_id,
    'request_more_count',
    case
      when p_action = 'request_more' then v_request_more_count
      else null
    end
  );
end;
$$;

revoke all on function accessrevamp_private.submit_accessrevamp_dashboard_feedback(
  uuid, uuid, text, text, uuid[], text, smallint
) from public, anon, authenticated;
grant execute on function accessrevamp_private.submit_accessrevamp_dashboard_feedback(
  uuid, uuid, text, text, uuid[], text, smallint
) to authenticated;

commit;
