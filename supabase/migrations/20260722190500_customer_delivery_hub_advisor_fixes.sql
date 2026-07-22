begin;

create index if not exists project_updates_created_by_idx
  on public.project_updates (created_by)
  where created_by is not null;

drop policy if exists project_updates_deny_browser_mutation on public.project_updates;

commit;
