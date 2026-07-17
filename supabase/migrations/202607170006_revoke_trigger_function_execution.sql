-- Trigger functions run through trusted database triggers and must not be exposed
-- as callable RPC endpoints to browser roles. PostgreSQL grants EXECUTE to
-- PUBLIC on new functions by default, so revoke it explicitly.

revoke all on function public.handle_accessrevamp_user()
  from public, anon, authenticated;
revoke all on function public.enforce_accessrevamp_outreach()
  from public, anon, authenticated;

grant execute on function public.handle_accessrevamp_user()
  to service_role;
grant execute on function public.enforce_accessrevamp_outreach()
  to service_role;

comment on function public.handle_accessrevamp_user() is
  'Internal Auth trigger for confirmed AccessRevamp account and paid-order linking; not browser-callable.';
comment on function public.enforce_accessrevamp_outreach() is
  'Internal outreach-queue trigger enforcing review, identity, suppression, spacing, and daily limits; not browser-callable.';
