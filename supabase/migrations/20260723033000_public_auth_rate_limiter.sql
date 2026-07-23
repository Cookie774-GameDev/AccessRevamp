begin;

-- A browser-callable SECURITY DEFINER wrapper is not a safe authentication
-- rate-limit boundary. The Netlify runtime now uses the service-only limiter
-- when a service client is available and a bounded in-process limiter otherwise.
drop function if exists public.consume_accessrevamp_public_auth_attempt(text, text);

commit;
