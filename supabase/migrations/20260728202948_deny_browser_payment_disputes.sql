create policy payment_disputes_deny_browser
on public.payment_disputes
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
