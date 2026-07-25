drop policy if exists accessrevamp_mailbox_owners_deny_browser
  on public.accessrevamp_mailbox_owners;
create policy accessrevamp_mailbox_owners_deny_browser
  on public.accessrevamp_mailbox_owners
  for all to anon, authenticated
  using (false) with check (false);

drop policy if exists accessrevamp_mailbox_owner_assignments_deny_browser
  on public.accessrevamp_mailbox_owner_assignments;
create policy accessrevamp_mailbox_owner_assignments_deny_browser
  on public.accessrevamp_mailbox_owner_assignments
  for all to anon, authenticated
  using (false) with check (false);
