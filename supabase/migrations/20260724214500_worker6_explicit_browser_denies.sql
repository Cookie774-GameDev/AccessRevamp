drop policy if exists inbound_email_messages_deny_browser on public.inbound_email_messages;
create policy inbound_email_messages_deny_browser
  on public.inbound_email_messages
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists inbound_email_assignments_deny_browser on public.inbound_email_assignments;
create policy inbound_email_assignments_deny_browser
  on public.inbound_email_assignments
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists inbound_email_worker_runs_deny_browser on public.inbound_email_worker_runs;
create policy inbound_email_worker_runs_deny_browser
  on public.inbound_email_worker_runs
  for all
  to anon, authenticated
  using (false)
  with check (false);
