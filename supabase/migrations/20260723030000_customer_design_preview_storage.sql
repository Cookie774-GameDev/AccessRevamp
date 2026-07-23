begin;

create or replace function accessrevamp_private.customer_can_read_storage_object(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, storage, accessrevamp_private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null
    or not accessrevamp_private.accessrevamp_session_is_verified() then
    return false;
  end if;

  if p_bucket_id = 'customer-project-artifacts' then
    return exists (
      select 1
      from public.project_artifacts artifact
      join public.customer_projects project on project.id = artifact.project_id
      where artifact.storage_provider = 'supabase'
        and artifact.storage_path = p_object_name
        and artifact.status in ('approved', 'delivered')
        and project.user_id = v_user_id
    ) or exists (
      select 1
      from public.project_design_options design
      join public.customer_projects project on project.id = design.project_id
      where design.storage_path = p_object_name
        and design.status in ('customer_ready', 'selected', 'delivered')
        and project.user_id = v_user_id
    );
  end if;

  if p_bucket_id = 'project-intake-assets' then
    return exists (
      select 1
      from public.project_intake_assets asset
      join public.project_intakes intake on intake.id = asset.intake_id
      join public.customer_projects project on project.id = intake.project_id
      where asset.storage_path = p_object_name
        and intake.user_id = v_user_id
        and project.user_id = v_user_id
    );
  end if;

  return false;
end;
$$;

revoke all on function accessrevamp_private.customer_can_read_storage_object(text, text)
  from public, anon;
grant execute on function accessrevamp_private.customer_can_read_storage_object(text, text)
  to authenticated, service_role;

commit;
