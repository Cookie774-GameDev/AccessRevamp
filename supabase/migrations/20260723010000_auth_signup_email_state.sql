begin;

create or replace function public.accessrevamp_auth_email_state(p_email text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, auth, public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_confirmed_at timestamptz;
begin
  if char_length(v_email) < 3 or char_length(v_email) > 254 or position('@' in v_email) < 2 then
    raise exception 'Invalid email address.' using errcode = '22023';
  end if;

  select email_confirmed_at
    into v_confirmed_at
  from auth.users
  where lower(email) = v_email
  order by created_at asc
  limit 1;

  if not found then
    return 'missing';
  end if;

  if v_confirmed_at is null then
    return 'unconfirmed';
  end if;

  return 'confirmed';
end;
$$;

revoke all on function public.accessrevamp_auth_email_state(text) from public, anon, authenticated;
grant execute on function public.accessrevamp_auth_email_state(text) to service_role;

commit;
