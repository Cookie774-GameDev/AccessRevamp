begin;

-- A password-authenticated client can create the short-lived challenge, but only
-- a session that was authenticated through the user's inbox may consume it.
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
  v_amr jsonb := coalesce(auth.jwt() -> 'amr', '[]'::jsonb);
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_challenge_token is null
    or p_challenge_token !~ '^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{32,128})$' then
    raise exception 'Verification details are invalid.' using errcode = '22023';
  end if;

  if jsonb_typeof(v_amr) <> 'array' then
    raise exception 'Email verification is required.' using errcode = '28000';
  end if;

  if not exists (
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

revoke all on function public.complete_accessrevamp_email_signin_current(text)
  from public, anon;
grant execute on function public.complete_accessrevamp_email_signin_current(text)
  to authenticated, service_role;

comment on function public.complete_accessrevamp_email_signin_current(text) is
  'Consumes the browser challenge only from an email-OTP or magic-link authenticated session and records the verified session.';

commit;
