-- Keep the customer-facing RPC names in the exposed schema while moving every
-- privileged table/auth lookup behind non-exposed, tightly granted functions.

create or replace function accessrevamp_private.begin_accessrevamp_email_signin()
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

create or replace function accessrevamp_private.complete_accessrevamp_email_signin_current(
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
  v_amr jsonb := coalesce(auth.jwt() -> 'amr', '[]'::jsonb);
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_challenge_token is null
    or p_challenge_token !~ '^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{32,128})$' then
    raise exception 'Verification details are invalid.' using errcode = '22023';
  end if;

  if jsonb_typeof(v_amr) <> 'array'
    or not exists (
      select 1
      from jsonb_array_elements(v_amr) as factor
      where factor ->> 'method' in ('otp', 'magiclink')
    ) then
    raise exception 'Email verification is required.' using errcode = '28000';
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

revoke all on function accessrevamp_private.begin_accessrevamp_email_signin()
  from public, anon, authenticated;
grant execute on function accessrevamp_private.begin_accessrevamp_email_signin()
  to authenticated;
revoke all on function accessrevamp_private.complete_accessrevamp_email_signin_current(text)
  from public, anon, authenticated;
grant execute on function accessrevamp_private.complete_accessrevamp_email_signin_current(text)
  to authenticated;

create or replace function public.begin_accessrevamp_email_signin()
returns text
language sql
security invoker
set search_path = pg_catalog, accessrevamp_private
as $$
  select accessrevamp_private.begin_accessrevamp_email_signin();
$$;

create or replace function public.complete_accessrevamp_email_signin_current(
  p_challenge_token text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, accessrevamp_private
as $$
  select accessrevamp_private.complete_accessrevamp_email_signin_current(p_challenge_token);
$$;

alter function public.begin_accessrevamp_email_signin() security invoker;
alter function public.complete_accessrevamp_email_signin_current(text) security invoker;
alter function public.accessrevamp_current_session_is_verified() security invoker;

revoke all on function public.begin_accessrevamp_email_signin()
  from public, anon, authenticated;
grant execute on function public.begin_accessrevamp_email_signin()
  to authenticated;
revoke all on function public.complete_accessrevamp_email_signin_current(text)
  from public, anon, authenticated;
grant execute on function public.complete_accessrevamp_email_signin_current(text)
  to authenticated;
revoke all on function public.accessrevamp_current_session_is_verified()
  from public, anon, authenticated;
grant execute on function public.accessrevamp_current_session_is_verified()
  to authenticated;
