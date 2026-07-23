begin;

-- Netlify can consume the existing database-backed limiter without a service-role
-- key. Only already-hashed request keys are accepted by the underlying function;
-- raw IP addresses and email addresses are never written to the database.
create or replace function public.consume_accessrevamp_public_auth_attempt(
  p_ip_key text,
  p_account_key text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.consume_accessrevamp_auth_attempt(p_ip_key, p_account_key);
end;
$$;

revoke all on function public.consume_accessrevamp_public_auth_attempt(text, text)
  from public;
grant execute on function public.consume_accessrevamp_public_auth_attempt(text, text)
  to anon, authenticated, service_role;

comment on function public.consume_accessrevamp_public_auth_attempt(text, text) is
  'Consumes the existing IP and account authentication limiter using server-hashed request keys.';

commit;
