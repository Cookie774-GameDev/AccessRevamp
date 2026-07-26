-- The reserve function returns an `expires_at` output column. Qualify the
-- table column in its cleanup statement so PL/pgSQL cannot treat that name as
-- an ambiguous output variable.
do $migration$
declare
  v_definition text;
  v_ambiguous text := 'and expires_at <= v_now;';
  v_qualified text := 'and public.upgrade_reservations.expires_at <= v_now;';
begin
  select pg_get_functiondef(
    'public.reserve_accessrevamp_upgrade(uuid,text,uuid)'::regprocedure
  )
  into v_definition;

  if v_definition is null then
    raise exception 'reserve_accessrevamp_upgrade is missing';
  end if;

  if strpos(v_definition, v_qualified) > 0 then
    return;
  end if;

  if strpos(v_definition, v_ambiguous) = 0 then
    raise exception 'reserve_accessrevamp_upgrade expiry predicate was not recognized';
  end if;

  execute replace(v_definition, v_ambiguous, v_qualified);
end;
$migration$;
