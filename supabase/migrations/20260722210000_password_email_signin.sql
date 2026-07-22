begin;

create table if not exists public.accessrevamp_login_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint accessrevamp_login_challenges_hash_check
    check (challenge_hash ~ '^[a-f0-9]{64}$'),
  constraint accessrevamp_login_challenges_email_check
    check (char_length(email) between 3 and 254 and email = lower(email)),
  constraint accessrevamp_login_challenges_status_check
    check (status in ('pending', 'consumed', 'expired', 'canceled')),
  constraint accessrevamp_login_challenges_expiry_check
    check (expires_at > created_at),
  constraint accessrevamp_login_challenges_consumed_check
    check ((status = 'consumed') = (consumed_at is not null))
);

create index if not exists accessrevamp_login_challenges_user_created_idx
  on public.accessrevamp_login_challenges (user_id, created_at desc);
create index if not exists accessrevamp_login_challenges_pending_expiry_idx
  on public.accessrevamp_login_challenges (expires_at)
  where status = 'pending';

create table if not exists public.accessrevamp_verified_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null unique references public.accessrevamp_login_challenges(id) on delete restrict,
  verified_at timestamptz not null default timezone('utc', now())
);

create index if not exists accessrevamp_verified_sessions_user_idx
  on public.accessrevamp_verified_sessions (user_id, verified_at desc);

alter table public.accessrevamp_login_challenges enable row level security;
alter table public.accessrevamp_verified_sessions enable row level security;

revoke all on table public.accessrevamp_login_challenges from public, anon, authenticated;
revoke all on table public.accessrevamp_verified_sessions from public, anon, authenticated;
grant all on table public.accessrevamp_login_challenges to service_role;
grant all on table public.accessrevamp_verified_sessions to service_role;

create or replace function public.consume_accessrevamp_auth_attempt(
  p_ip_key text,
  p_account_key text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window timestamptz;
  v_count integer;
  v_first_key text;
  v_second_key text;
begin
  if p_ip_key is null or p_ip_key !~ '^[a-f0-9]{64}$'
    or p_account_key is null or p_account_key !~ '^[a-f0-9]{64}$'
    or p_ip_key = p_account_key then
    raise exception 'Invalid authentication rate key.' using errcode = '22023';
  end if;

  v_first_key := least(p_ip_key, p_account_key);
  v_second_key := greatest(p_ip_key, p_account_key);
  perform pg_advisory_xact_lock(hashtextextended(v_first_key, 0));
  perform pg_advisory_xact_lock(hashtextextended(v_second_key, 0));

  select window_started_at, request_count
    into v_window, v_count
  from public.contact_rate_limits
  where rate_key = p_ip_key
  for update;

  if not found or v_window < v_now - interval '1 hour' then
    insert into public.contact_rate_limits (rate_key, window_started_at, request_count, updated_at)
    values (p_ip_key, v_now, 1, v_now)
    on conflict (rate_key) do update
      set window_started_at = excluded.window_started_at,
          request_count = 1,
          updated_at = excluded.updated_at;
  else
    if v_count >= 25 then
      raise exception 'Authentication rate limit exceeded.' using errcode = 'P0001';
    end if;
    update public.contact_rate_limits
    set request_count = request_count + 1,
        updated_at = v_now
    where rate_key = p_ip_key;
  end if;

  select window_started_at, request_count
    into v_window, v_count
  from public.contact_rate_limits
  where rate_key = p_account_key
  for update;

  if not found or v_window < v_now - interval '1 hour' then
    insert into public.contact_rate_limits (rate_key, window_started_at, request_count, updated_at)
    values (p_account_key, v_now, 1, v_now)
    on conflict (rate_key) do update
      set window_started_at = excluded.window_started_at,
          request_count = 1,
          updated_at = excluded.updated_at;
  else
    if v_count >= 8 then
      raise exception 'Authentication rate limit exceeded.' using errcode = 'P0001';
    end if;
    update public.contact_rate_limits
    set request_count = request_count + 1,
        updated_at = v_now
    where rate_key = p_account_key;
  end if;
end;
$$;

revoke all on function public.consume_accessrevamp_auth_attempt(text, text)
  from public, anon, authenticated;
grant execute on function public.consume_accessrevamp_auth_attempt(text, text)
  to service_role;

create or replace function public.accessrevamp_session_is_verified()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.accessrevamp_verified_sessions verified
    join auth.sessions session
      on session.id = verified.session_id
     and session.user_id = verified.user_id
    where verified.user_id = (select auth.uid())
      and verified.session_id = nullif((select auth.jwt() ->> 'session_id'), '')::uuid
  );
$$;

revoke all on function public.accessrevamp_session_is_verified() from public, anon;
grant execute on function public.accessrevamp_session_is_verified() to authenticated, service_role;

create or replace function public.complete_accessrevamp_email_signin(
  p_challenge_hash text,
  p_user_id uuid,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_challenge public.accessrevamp_login_challenges%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if p_challenge_hash is null or p_challenge_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid sign-in verification.' using errcode = '22023';
  end if;

  perform 1
  from auth.sessions session
  where session.id = p_session_id
    and session.user_id = p_user_id;

  if not found then
    raise exception 'Authentication session is unavailable.' using errcode = '28000';
  end if;

  select challenge.*
    into v_challenge
  from public.accessrevamp_login_challenges challenge
  where challenge.challenge_hash = p_challenge_hash
  for update;

  if not found
    or v_challenge.user_id <> p_user_id
    or v_challenge.status <> 'pending'
    or v_challenge.expires_at <= v_now then
    raise exception 'Sign-in verification is invalid or expired.' using errcode = '28000';
  end if;

  update public.accessrevamp_login_challenges
  set status = 'consumed',
      consumed_at = v_now
  where id = v_challenge.id;

  insert into public.accessrevamp_verified_sessions (
    session_id,
    user_id,
    challenge_id,
    verified_at
  )
  values (
    p_session_id,
    p_user_id,
    v_challenge.id,
    v_now
  )
  on conflict (session_id) do update
  set user_id = excluded.user_id,
      challenge_id = excluded.challenge_id,
      verified_at = excluded.verified_at;

  update public.accessrevamp_login_challenges
  set status = 'expired'
  where status = 'pending'
    and expires_at <= v_now;

  return jsonb_build_object(
    'verified', true,
    'session_id', p_session_id,
    'verified_at', v_now
  );
end;
$$;

revoke all on function public.complete_accessrevamp_email_signin(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.complete_accessrevamp_email_signin(text, uuid, uuid)
  to service_role;

-- Browser-visible customer data requires both a valid Supabase session and
-- completion of AccessRevamp's password-plus-email sign-in ceremony.
drop policy if exists profiles_verified_session_select on public.profiles;
create policy profiles_verified_session_select
  on public.profiles as restrictive
  for select to authenticated
  using (public.accessrevamp_session_is_verified());

drop policy if exists profiles_verified_session_update on public.profiles;
create policy profiles_verified_session_update
  on public.profiles as restrictive
  for update to authenticated
  using (public.accessrevamp_session_is_verified())
  with check (public.accessrevamp_session_is_verified());

drop policy if exists orders_verified_session_select on public.orders;
create policy orders_verified_session_select
  on public.orders as restrictive
  for select to authenticated
  using (public.accessrevamp_session_is_verified());

drop policy if exists entitlements_verified_session_select on public.entitlements;
create policy entitlements_verified_session_select
  on public.entitlements as restrictive
  for select to authenticated
  using (public.accessrevamp_session_is_verified());

drop policy if exists customer_projects_verified_session_select on public.customer_projects;
create policy customer_projects_verified_session_select
  on public.customer_projects as restrictive
  for select to authenticated
  using (public.accessrevamp_session_is_verified());

drop policy if exists refund_requests_verified_session_select on public.refund_requests;
create policy refund_requests_verified_session_select
  on public.refund_requests as restrictive
  for select to authenticated
  using (public.accessrevamp_session_is_verified());

drop policy if exists refund_requests_verified_session_insert on public.refund_requests;
create policy refund_requests_verified_session_insert
  on public.refund_requests as restrictive
  for insert to authenticated
  with check (public.accessrevamp_session_is_verified());

drop policy if exists project_updates_verified_session_select on public.project_updates;
create policy project_updates_verified_session_select
  on public.project_updates as restrictive
  for select to authenticated
  using (public.accessrevamp_session_is_verified());

drop policy if exists project_deliveries_verified_session_select on public.project_deliveries;
create policy project_deliveries_verified_session_select
  on public.project_deliveries as restrictive
  for select to authenticated
  using (public.accessrevamp_session_is_verified());

drop policy if exists project_design_options_verified_session_select on public.project_design_options;
create policy project_design_options_verified_session_select
  on public.project_design_options as restrictive
  for select to authenticated
  using (public.accessrevamp_session_is_verified());

drop policy if exists project_workflows_verified_session_select on public.project_workflows;
create policy project_workflows_verified_session_select
  on public.project_workflows as restrictive
  for select to authenticated
  using (public.accessrevamp_session_is_verified());

commit;
