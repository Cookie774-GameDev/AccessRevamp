alter table public.accessrevamp_mailboxes
  add column if not exists provider_mailbox_id text;
create unique index if not exists accessrevamp_mailboxes_provider_id_uidx
  on public.accessrevamp_mailboxes (provider, provider_mailbox_id)
  where provider_mailbox_id is not null;

create table if not exists public.accessrevamp_mailbox_owners (
  code text primary key check (code ~ '^[a-z][a-z0-9_-]{1,31}$'),
  display_name text not null unique,
  worker_number smallint not null unique check (worker_number between 1 and 5),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.accessrevamp_mailbox_owners (code, display_name, worker_number)
values
  ('avery', 'Avery', 1),
  ('jordan', 'Jordan', 2),
  ('casey', 'Kasey', 3),
  ('riley', 'Riley', 4),
  ('morgan', 'Morgan', 5)
on conflict (code) do update
set display_name = excluded.display_name,
    worker_number = excluded.worker_number,
    active = true;

create table if not exists public.accessrevamp_mailbox_owner_assignments (
  mailbox_id uuid primary key references public.accessrevamp_mailboxes(id) on delete restrict,
  owner_code text not null references public.accessrevamp_mailbox_owners(code) on delete restrict,
  position smallint not null check (position between 1 and 20),
  assigned_at timestamptz not null default timezone('utc', now()),
  unique (owner_code, position)
);

create index if not exists accessrevamp_mailbox_owner_assignments_owner_idx
  on public.accessrevamp_mailbox_owner_assignments (owner_code, position);

create or replace function public.prevent_accessrevamp_mailbox_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'Permanent mailbox ownership cannot be changed or deleted.'
    using errcode = '55000';
end;
$$;

drop trigger if exists prevent_accessrevamp_mailbox_reassignment_trigger
  on public.accessrevamp_mailbox_owner_assignments;
create trigger prevent_accessrevamp_mailbox_reassignment_trigger
before update or delete on public.accessrevamp_mailbox_owner_assignments
for each row execute function public.prevent_accessrevamp_mailbox_reassignment();

create or replace function public.assign_accessrevamp_permanent_mailbox_owners()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_mailbox_count integer;
  v_assignment_count integer;
begin
  select count(*) into v_mailbox_count
  from public.accessrevamp_mailboxes
  where provider = 'icemail_azure' and status = 'active';

  if v_mailbox_count <> 100 then
    raise exception 'Expected exactly 100 active Icemail Azure mailboxes; found %.', v_mailbox_count
      using errcode = '55000';
  end if;

  with ranked as (
    select
      id,
      row_number() over (order by address, id) as ordinal
    from public.accessrevamp_mailboxes
    where provider = 'icemail_azure' and status = 'active'
  ),
  owners as (
    select * from (values
      (1, 'avery'), (2, 'jordan'), (3, 'casey'), (4, 'riley'), (5, 'morgan')
    ) as configured(owner_number, owner_code)
  )
  insert into public.accessrevamp_mailbox_owner_assignments (mailbox_id, owner_code, position)
  select
    ranked.id,
    owners.owner_code,
    (((ranked.ordinal - 1) % 20) + 1)::smallint
  from ranked
  join owners on owners.owner_number = (((ranked.ordinal - 1) / 20) + 1)
  on conflict (mailbox_id) do nothing;

  select count(*) into v_assignment_count
  from public.accessrevamp_mailbox_owner_assignments;
  if v_assignment_count <> 100 then
    raise exception 'Permanent mailbox assignment count is %, expected 100.', v_assignment_count
      using errcode = '55000';
  end if;

  if exists (
    select owner_code
    from public.accessrevamp_mailbox_owner_assignments
    group by owner_code
    having count(*) <> 20
  ) then
    raise exception 'Every owner must have exactly 20 mailboxes.' using errcode = '55000';
  end if;

  return jsonb_build_object('owners', 5, 'mailboxes', v_assignment_count, 'perOwner', 20);
end;
$$;

alter table public.accessrevamp_mailbox_owners enable row level security;
alter table public.accessrevamp_mailbox_owner_assignments enable row level security;

create policy accessrevamp_mailbox_owners_deny_browser
  on public.accessrevamp_mailbox_owners
  for all to anon, authenticated
  using (false) with check (false);
create policy accessrevamp_mailbox_owner_assignments_deny_browser
  on public.accessrevamp_mailbox_owner_assignments
  for all to anon, authenticated
  using (false) with check (false);

revoke all on public.accessrevamp_mailbox_owners,
  public.accessrevamp_mailbox_owner_assignments
  from public, anon, authenticated;
grant all on public.accessrevamp_mailbox_owners,
  public.accessrevamp_mailbox_owner_assignments
  to service_role;

revoke all on function public.prevent_accessrevamp_mailbox_reassignment() from public, anon, authenticated;
revoke all on function public.assign_accessrevamp_permanent_mailbox_owners() from public, anon, authenticated;
grant execute on function public.prevent_accessrevamp_mailbox_reassignment() to service_role;
grant execute on function public.assign_accessrevamp_permanent_mailbox_owners() to service_role;

select public.assign_accessrevamp_permanent_mailbox_owners();
