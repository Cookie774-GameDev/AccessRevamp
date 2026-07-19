begin;

create table if not exists public.private_pricing_contexts (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  customer_label text not null check (char_length(trim(customer_label)) between 1 and 120),
  website_url text not null check (website_url ~ '^https://[^[:space:]]+$'),
  scope_summary text not null check (char_length(trim(scope_summary)) between 20 and 800),
  recommended_tier text not null check (recommended_tier in ('free_snapshot', 'homepage_reveal', 'complete_revamp', 'cinematic_scroll')),
  internal_reference text check (internal_reference is null or char_length(internal_reference) <= 240),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  constraint private_pricing_contexts_expiry_check check (expires_at > created_at),
  constraint private_pricing_contexts_revocation_state_check check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
    or (status = 'expired' and revoked_at is null)
  )
);

create index if not exists private_pricing_contexts_active_expiry_idx
  on public.private_pricing_contexts (expires_at)
  where status = 'active';
create index if not exists private_pricing_contexts_created_by_idx
  on public.private_pricing_contexts (created_by, created_at desc);

create table if not exists public.private_pricing_resolution_limits (
  rate_key text primary key check (rate_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1 check (attempt_count between 1 and 1000)
);

alter table public.private_pricing_contexts enable row level security;
alter table public.private_pricing_resolution_limits enable row level security;
revoke all on table public.private_pricing_contexts from public, anon, authenticated;
revoke all on table public.private_pricing_resolution_limits from public, anon, authenticated;
grant all on table public.private_pricing_contexts to service_role;
grant all on table public.private_pricing_resolution_limits to service_role;

create or replace function public.issue_accessrevamp_pricing_context(
  p_customer_label text,
  p_website_url text,
  p_scope_summary text,
  p_recommended_tier text,
  p_internal_reference text,
  p_expires_at timestamptz,
  p_operator_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  raw_token text;
  context_id uuid;
begin
  if not exists (
    select 1 from public.accessrevamp_operators
    where user_id = p_operator_id and active = true
  ) then raise exception 'operator access required'; end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '90 days' then
    raise exception 'pricing context expiry must be within 90 days';
  end if;
  if p_website_url !~ '^https://[^[:space:]]+$' then raise exception 'public HTTPS website required'; end if;
  if p_recommended_tier not in ('free_snapshot', 'homepage_reveal', 'complete_revamp', 'cinematic_scroll') then
    raise exception 'invalid recommended tier';
  end if;

  raw_token := translate(trim(trailing '=' from encode(gen_random_bytes(32), 'base64')), '+/', '-_');
  insert into public.private_pricing_contexts (
    token_hash, customer_label, website_url, scope_summary, recommended_tier,
    internal_reference, expires_at, created_by
  ) values (
    encode(digest(raw_token, 'sha256'), 'hex'), trim(p_customer_label), p_website_url,
    trim(p_scope_summary), p_recommended_tier, nullif(trim(p_internal_reference), ''),
    p_expires_at, p_operator_id
  ) returning id into context_id;

  insert into public.accessrevamp_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_operator_id, 'pricing_context_issued', 'private_pricing_context', context_id::text,
    jsonb_build_object('recommended_tier', p_recommended_tier, 'expires_at', p_expires_at));

  return jsonb_build_object('id', context_id, 'token', raw_token, 'expiresAt', p_expires_at);
end;
$$;

create or replace function public.revoke_accessrevamp_pricing_context(
  p_context_id uuid,
  p_operator_id uuid,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed integer;
begin
  if not exists (
    select 1 from public.accessrevamp_operators
    where user_id = p_operator_id and active = true
  ) then raise exception 'operator access required'; end if;
  if char_length(trim(p_reason)) < 8 then raise exception 'revocation reason required'; end if;

  update public.private_pricing_contexts
  set status = 'revoked', revoked_at = now()
  where id = p_context_id and status = 'active';
  get diagnostics changed = row_count;
  if changed = 0 then raise exception 'active pricing context not found'; end if;

  insert into public.accessrevamp_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_operator_id, 'pricing_context_revoked', 'private_pricing_context', p_context_id::text,
    jsonb_build_object('reason', left(trim(p_reason), 500)));
end;
$$;

create or replace function public.consume_accessrevamp_pricing_resolution_limit(
  p_rate_key text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare attempts integer;
begin
  if p_rate_key !~ '^[0-9a-f]{64}$' then return false; end if;
  insert into public.private_pricing_resolution_limits (rate_key, window_started_at, attempt_count)
  values (p_rate_key, now(), 1)
  on conflict (rate_key) do update set
    window_started_at = case
      when private_pricing_resolution_limits.window_started_at < now() - interval '15 minutes' then now()
      else private_pricing_resolution_limits.window_started_at
    end,
    attempt_count = case
      when private_pricing_resolution_limits.window_started_at < now() - interval '15 minutes' then 1
      else private_pricing_resolution_limits.attempt_count + 1
    end
  returning attempt_count into attempts;
  return attempts <= 20;
end;
$$;

create or replace function public.resolve_accessrevamp_pricing_context(
  p_token_hash text
) returns table (
  customer_label text,
  website_url text,
  scope_summary text,
  recommended_tier text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare context_record public.private_pricing_contexts;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then return; end if;

  select * into context_record
  from public.private_pricing_contexts
  where token_hash = p_token_hash
  for update;
  if not found then return; end if;

  if context_record.status = 'active' and context_record.expires_at <= now() then
    update public.private_pricing_contexts set status = 'expired' where id = context_record.id;
    return;
  end if;
  if context_record.status <> 'active' then return; end if;

  update public.private_pricing_contexts set last_viewed_at = now() where id = context_record.id;
  insert into public.accessrevamp_audit_log (action, entity_type, entity_id, details)
  values ('pricing_context_viewed', 'private_pricing_context', context_record.id::text, '{}'::jsonb);

  return query select context_record.customer_label, context_record.website_url,
    context_record.scope_summary, context_record.recommended_tier, context_record.expires_at;
end;
$$;

revoke all on function public.issue_accessrevamp_pricing_context(text,text,text,text,text,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.issue_accessrevamp_pricing_context(text,text,text,text,text,timestamptz,uuid) to service_role;
revoke all on function public.revoke_accessrevamp_pricing_context(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.revoke_accessrevamp_pricing_context(uuid,uuid,text) to service_role;
revoke all on function public.consume_accessrevamp_pricing_resolution_limit(text) from public, anon, authenticated;
grant execute on function public.consume_accessrevamp_pricing_resolution_limit(text) to service_role;
revoke all on function public.resolve_accessrevamp_pricing_context(text) from public, anon, authenticated;
grant execute on function public.resolve_accessrevamp_pricing_context(text) to service_role;

comment on table public.private_pricing_contexts is 'Hash-only, expiring customer context for canonical AccessRevamp pricing; never custom pricing.';

commit;
