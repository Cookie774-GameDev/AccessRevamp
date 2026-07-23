begin;

-- The customer sign-in ceremony must not depend on a Netlify service-role
-- environment variable. The password-authenticated session creates a short-lived
-- browser challenge, then the email-authenticated session consumes it.
create or replace function public.begin_accessrevamp_email_signin()
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_confirmed_at timestamptz;
  v_now timestamptz := timezone('utc', now());
  v_recent_count integer;
  v_token text;
  v_hash text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select lower(email), email_confirmed_at
    into v_email, v_confirmed_at
  from auth.users
  where id = v_user_id;

  if v_email is null or v_confirmed_at is null then
    raise exception 'A confirmed email address is required.' using errcode = '28000';
  end if;

  select count(*)::integer
    into v_recent_count
  from public.accessrevamp_login_challenges
  where user_id = v_user_id
    and created_at >= v_now - interval '1 hour';

  if v_recent_count >= 8 then
    raise exception 'Too many verification requests. Try again later.' using errcode = 'P0001';
  end if;

  update public.accessrevamp_login_challenges
  set status = 'expired'
  where status = 'pending'
    and expires_at <= v_now;

  update public.accessrevamp_login_challenges
  set status = 'canceled'
  where user_id = v_user_id
    and status = 'pending';

  delete from public.accessrevamp_login_challenges
  where status <> 'pending'
    and created_at < v_now - interval '30 days';

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into public.accessrevamp_login_challenges (
    challenge_hash,
    user_id,
    email,
    status,
    expires_at
  ) values (
    v_hash,
    v_user_id,
    v_email,
    'pending',
    v_now + interval '10 minutes'
  );

  return v_token;
end;
$$;

revoke all on function public.begin_accessrevamp_email_signin()
  from public, anon;
grant execute on function public.begin_accessrevamp_email_signin()
  to authenticated, service_role;

create or replace function public.complete_accessrevamp_email_signin_current(
  p_challenge_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_hash text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_challenge_token is null
    or p_challenge_token !~ '^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{32,128})$' then
    raise exception 'Verification details are invalid.' using errcode = '22023';
  end if;

  begin
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception when others then
    raise exception 'Authentication session is unavailable.' using errcode = '28000';
  end;

  if v_session_id is null then
    raise exception 'Authentication session is unavailable.' using errcode = '28000';
  end if;

  v_hash := encode(digest(p_challenge_token, 'sha256'), 'hex');
  return public.complete_accessrevamp_email_signin(v_hash, v_user_id, v_session_id);
end;
$$;

revoke all on function public.complete_accessrevamp_email_signin_current(text)
  from public, anon;
grant execute on function public.complete_accessrevamp_email_signin_current(text)
  to authenticated, service_role;

create or replace function public.accessrevamp_current_session_is_verified()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, accessrevamp_private
as $$
  select accessrevamp_private.accessrevamp_session_is_verified();
$$;

revoke all on function public.accessrevamp_current_session_is_verified()
  from public, anon;
grant execute on function public.accessrevamp_current_session_is_verified()
  to authenticated, service_role;

-- Customer hub reads use the caller's access token and existing row ownership,
-- instead of a missing service-role secret in the hosting environment.
grant select on table public.project_intakes to authenticated;
grant select on table public.project_intake_assets to authenticated;
grant select on table public.project_workflow_tasks to authenticated;
grant select on table public.project_artifacts to authenticated;

drop policy if exists project_intakes_select_own_verified on public.project_intakes;
create policy project_intakes_select_own_verified
  on public.project_intakes
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and accessrevamp_private.accessrevamp_session_is_verified()
    and exists (
      select 1
      from public.customer_projects project
      where project.id = project_intakes.project_id
        and project.user_id = (select auth.uid())
    )
  );

drop policy if exists project_intake_assets_select_own_verified on public.project_intake_assets;
create policy project_intake_assets_select_own_verified
  on public.project_intake_assets
  for select
  to authenticated
  using (
    accessrevamp_private.accessrevamp_session_is_verified()
    and exists (
      select 1
      from public.project_intakes intake
      join public.customer_projects project on project.id = intake.project_id
      where intake.id = project_intake_assets.intake_id
        and intake.user_id = (select auth.uid())
        and project.user_id = (select auth.uid())
    )
  );

drop policy if exists project_workflow_tasks_select_own_verified on public.project_workflow_tasks;
create policy project_workflow_tasks_select_own_verified
  on public.project_workflow_tasks
  for select
  to authenticated
  using (
    accessrevamp_private.accessrevamp_session_is_verified()
    and exists (
      select 1
      from public.project_workflows workflow
      join public.customer_projects project on project.id = workflow.project_id
      where workflow.id = project_workflow_tasks.workflow_id
        and project.user_id = (select auth.uid())
    )
  );

drop policy if exists project_artifacts_select_own_published_verified on public.project_artifacts;
create policy project_artifacts_select_own_published_verified
  on public.project_artifacts
  for select
  to authenticated
  using (
    status in ('approved', 'delivered')
    and accessrevamp_private.accessrevamp_session_is_verified()
    and exists (
      select 1
      from public.customer_projects project
      where project.id = project_artifacts.project_id
        and project.user_id = (select auth.uid())
    )
  );

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

drop policy if exists customer_private_assets_select_verified on storage.objects;
create policy customer_private_assets_select_verified
  on storage.objects
  for select
  to authenticated
  using (
    accessrevamp_private.customer_can_read_storage_object(bucket_id, name)
  );

comment on function public.begin_accessrevamp_email_signin() is
  'Creates a ten-minute password-bound sign-in challenge for the currently authenticated and confirmed customer.';
comment on function public.complete_accessrevamp_email_signin_current(text) is
  'Consumes the browser challenge from the current email-authenticated session and records the verified session.';

commit;
