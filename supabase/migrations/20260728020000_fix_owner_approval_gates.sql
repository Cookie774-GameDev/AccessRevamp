begin;

create or replace function public.approve_accessrevamp_creative_design(
  p_option_id uuid,
  p_operator_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  o public.project_design_options%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if not exists (
    select 1
    from public.accessrevamp_operators
    where user_id = p_operator_id
      and active
  ) then
    raise exception 'operator access required';
  end if;

  update public.project_design_options
  set design_review_status = 'approved',
      design_approved_by = p_operator_id,
      design_approved_at = v_now,
      human_approved_by = p_operator_id::text,
      human_approved_at = v_now,
      delivery_review_status = 'pending',
      delivery_approved_by = null,
      delivery_approved_at = null,
      status = case
        when status in ('customer_ready', 'selected', 'delivered') then 'human_review'
        else status
      end,
      updated_at = v_now
  where id = p_option_id
  returning * into o;

  if o.id is null then
    raise exception 'design option not found';
  end if;

  insert into public.project_creative_review_events (
    project_id,
    design_option_id,
    actor_id,
    event_type
  )
  values (
    o.project_id,
    o.id,
    p_operator_id,
    'design_approved'
  );

  return true;
end;
$$;

create or replace function public.approve_accessrevamp_creative_delivery(
  p_option_id uuid,
  p_operator_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  o public.project_design_options%rowtype;
  v_has_exact_asset boolean;
  v_now timestamptz := timezone('utc', now());
begin
  if not exists (
    select 1
    from public.accessrevamp_operators
    where user_id = p_operator_id
      and active
  ) then
    raise exception 'operator access required';
  end if;

  select *
  into o
  from public.project_design_options
  where id = p_option_id
  for update;

  if o.id is null then
    raise exception 'design option not found';
  end if;

  if o.design_review_status <> 'approved'
    or o.design_approved_by is null
    or o.design_approved_at is null
    or o.human_approved_by is null
    or o.human_approved_at is null
  then
    raise exception 'design approval required';
  end if;

  if o.rights_review_status <> 'approved'
    or o.copy_review_status <> 'approved'
    or o.product_fidelity_status <> 'approved'
    or o.source_manifest_verified_at is null
  then
    raise exception 'delivery review prerequisites incomplete';
  end if;

  if o.option_group in (
    'homepage_normal',
    'homepage_cinematic',
    'cinematic_sequence',
    'cinematic_scene',
    'page_reference',
    'poster_still',
    'poster_animated'
  ) then
    select exists (
      select 1
      from public.project_design_option_assets link
      join public.project_source_assets asset
        on asset.id = link.source_asset_id
      where link.design_option_id = o.id
        and asset.project_id = o.project_id
        and link.asset_role in ('product_exact', 'logo_exact', 'brand_photo_exact')
        and asset.verification_status = 'verified'
        and asset.rights_status in ('customer_owned', 'licensed', 'public_permission')
    )
    into v_has_exact_asset;

    if not v_has_exact_asset then
      raise exception 'No verified exact product or logo source asset is linked';
    end if;
  end if;

  update public.project_design_options
  set delivery_review_status = 'approved',
      delivery_approved_by = p_operator_id,
      delivery_approved_at = v_now,
      status = 'customer_ready',
      updated_at = v_now
  where id = o.id;

  insert into public.project_creative_review_events (
    project_id,
    design_option_id,
    actor_id,
    event_type
  )
  values (
    o.project_id,
    o.id,
    p_operator_id,
    'delivery_approved'
  );

  return true;
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
  v_option public.project_design_options%rowtype;
  v_design_option_id uuid;
  v_has_exact_asset boolean;
  v_update_id uuid;
  v_delivery_id uuid;
  v_delivery_version smallint;
  v_now timestamptz := timezone('utc', now());
  v_next_status text := case when p_mark_delivered then 'delivered' else 'approved' end;
  v_title text;
  v_body text;
begin
  if not exists (
    select 1
    from public.accessrevamp_operators
    where user_id = p_created_by
      and active
  ) then
    raise exception 'operator access required';
  end if;

  select *
  into v_artifact
  from public.project_artifacts
  where id = p_artifact_id
  for update;

  if not found then
    raise exception 'Artifact not found.' using errcode = 'P0002';
  end if;

  if v_artifact.status <> 'draft' or v_artifact.storage_path is null then
    raise exception 'Artifact cannot be finalized.' using errcode = '55000';
  end if;

  select *
  into v_project
  from public.customer_projects
  where id = v_artifact.project_id
  for update;

  if not found then
    raise exception 'Project not found.' using errcode = 'P0002';
  end if;

  if v_artifact.artifact_type in (
    'design_image',
    'poster',
    'video',
    'website_build',
    'skill_md',
    'design_md'
  ) then
    if coalesce(v_artifact.metadata ->> 'design_option_id', '') !~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    then
      raise exception 'Approval-sensitive artifact requires a valid design option.' using errcode = '55000';
    end if;

    v_design_option_id := (v_artifact.metadata ->> 'design_option_id')::uuid;

    select option.*
    into v_option
    from public.project_design_options option
    where option.id = v_design_option_id
      and option.project_id = v_artifact.project_id
    for update;

    if not found then
      raise exception 'Approved design option was not found for this project.' using errcode = '55000';
    end if;

    if v_option.design_review_status <> 'approved'
      or v_option.design_approved_by is null
      or v_option.design_approved_at is null
      or v_option.human_approved_by is null
      or v_option.human_approved_at is null
    then
      raise exception 'Durable owner design approval is required.' using errcode = '55000';
    end if;

    if v_option.delivery_review_status <> 'approved'
      or v_option.delivery_approved_by is null
      or v_option.delivery_approved_at is null
    then
      raise exception 'Durable owner delivery approval is required.' using errcode = '55000';
    end if;

    if v_option.rights_review_status <> 'approved'
      or v_option.copy_review_status <> 'approved'
      or v_option.product_fidelity_status <> 'approved'
      or v_option.source_manifest_verified_at is null
    then
      raise exception 'Fidelity and source review prerequisites are incomplete.' using errcode = '55000';
    end if;

    if v_option.option_group in (
      'homepage_normal',
      'homepage_cinematic',
      'cinematic_sequence',
      'cinematic_scene',
      'page_reference',
      'poster_still',
      'poster_animated'
    ) then
      select exists (
        select 1
        from public.project_design_option_assets link
        join public.project_source_assets asset
          on asset.id = link.source_asset_id
        where link.design_option_id = v_option.id
          and asset.project_id = v_artifact.project_id
          and link.asset_role in ('product_exact', 'logo_exact', 'brand_photo_exact')
          and asset.verification_status = 'verified'
          and asset.rights_status in ('customer_owned', 'licensed', 'public_permission')
      )
      into v_has_exact_asset;

      if not v_has_exact_asset then
        raise exception 'No verified exact product or logo source asset is linked.' using errcode = '55000';
      end if;
    end if;

    if v_artifact.artifact_type in ('skill_md', 'design_md')
      and not exists (
        select 1
        from public.project_approval_selections selection
        join public.project_approval_links approval
          on approval.id = selection.approval_link_id
        where selection.project_id = v_artifact.project_id
          and v_design_option_id = any (selection.selected_option_ids)
          and approval.project_id = v_artifact.project_id
          and approval.purpose in (
            'homepage_selection',
            'revision_selection',
            'cinematic_sequence_selection',
            'scene_selection'
          )
          and approval.status = 'used'
          and approval.used_at is not null
      )
      and not exists (
        select 1
        from public.customer_project_feedback feedback
        where feedback.project_id = v_artifact.project_id
          and feedback.action = 'select_designs'
          and feedback.status <> 'rejected'
          and v_design_option_id = any (feedback.selected_option_ids)
      )
    then
      raise exception 'Durable project selection is required for specification artifacts.' using errcode = '55000';
    end if;
  end if;

  v_title := left(
    coalesce(
      nullif(v_artifact.metadata ->> 'title', ''),
      v_artifact.filename,
      'New project file'
    ),
    160
  );
  v_body := left(
    coalesce(
      nullif(v_artifact.metadata ->> 'description', ''),
      coalesce(v_artifact.filename, 'A new file') || ' is now available in your customer hub.'
    ),
    6000
  );

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

revoke all on function public.approve_accessrevamp_creative_design(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_accessrevamp_creative_design(uuid, uuid)
  to service_role;

revoke all on function public.approve_accessrevamp_creative_delivery(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_accessrevamp_creative_delivery(uuid, uuid)
  to service_role;

revoke all on function public.operator_finalize_project_artifact(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.operator_finalize_project_artifact(uuid, uuid, boolean)
  to service_role;

comment on function public.operator_finalize_project_artifact(uuid, uuid, boolean) is
  'Publishes an artifact only after operator, project-selection, owner-review, delivery-review, and source-fidelity gates appropriate to its type.';

commit;
