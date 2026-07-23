begin;

-- Correct installations where the earlier wrapper was applied before review.
-- Only trusted server callers may consume the owner-privileged database limiter.
drop function if exists public.consume_accessrevamp_public_auth_attempt(text, text);

revoke all on function public.consume_accessrevamp_auth_attempt(text, text)
  from public, anon, authenticated;
grant execute on function public.consume_accessrevamp_auth_attempt(text, text)
  to service_role;

comment on function public.consume_accessrevamp_auth_attempt(text, text) is
  'Consumes authentication rate-limit buckets for trusted service-role callers only.';

commit;
