begin;

create schema if not exists accessrevamp_private;
revoke all on schema accessrevamp_private from public, anon;
grant usage on schema accessrevamp_private to authenticated, service_role;

do $$
begin
  if to_regprocedure('public.accessrevamp_session_is_verified()') is not null
    and to_regprocedure('accessrevamp_private.accessrevamp_session_is_verified()') is null then
    execute 'alter function public.accessrevamp_session_is_verified() set schema accessrevamp_private';
  end if;
end;
$$;

revoke all on function accessrevamp_private.accessrevamp_session_is_verified()
  from public, anon, authenticated;
grant execute on function accessrevamp_private.accessrevamp_session_is_verified()
  to authenticated, service_role;

drop policy if exists accessrevamp_login_challenges_deny_browser
  on public.accessrevamp_login_challenges;
create policy accessrevamp_login_challenges_deny_browser
  on public.accessrevamp_login_challenges
  for all to anon, authenticated
  using (false)
  with check (false);

drop policy if exists accessrevamp_verified_sessions_deny_browser
  on public.accessrevamp_verified_sessions;
create policy accessrevamp_verified_sessions_deny_browser
  on public.accessrevamp_verified_sessions
  for all to anon, authenticated
  using (false)
  with check (false);

commit;
