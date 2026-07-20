create or replace function public.validate_accessrevamp_payment_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_catalog_count integer;
  v_operator_count integer;
begin
  if new.expected_livemode and new.live_payment_approved is not true then
    raise exception using errcode = '55000', message = 'Live payment mode requires a separate explicit approval flag';
  end if;
  if new.checkout_enabled then
    select count(*) into v_catalog_count
      from public.stripe_price_catalog
     where active = true and livemode = new.expected_livemode
       and transition_key in ('none->homepage_reveal','none->complete_revamp','none->cinematic_scroll','homepage_reveal->complete_revamp','homepage_reveal->cinematic_scroll','complete_revamp->cinematic_scroll');
    if v_catalog_count <> 6 then
      raise exception using errcode = '55000', message = 'Checkout cannot be enabled until all six exact Stripe prices are verified';
    end if;
    if new.configuration_verified_at is null or new.configuration_verified_at < timezone('utc', now()) - interval '24 hours' then
      raise exception using errcode = '55000', message = 'Checkout configuration must be verified within the last 24 hours';
    end if;
  end if;
  if new.refunds_enabled then
    if new.require_two_person_refund is not true then
      raise exception using errcode = '55000', message = 'Refunds require two-person approval';
    end if;
    select count(*) into v_operator_count from public.accessrevamp_operators where active = true;
    if v_operator_count < 2 then
      raise exception using errcode = '55000', message = 'At least two active operators are required before refunds can be enabled';
    end if;
  end if;
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;
revoke all on function public.validate_accessrevamp_payment_settings() from public, anon, authenticated;
grant execute on function public.validate_accessrevamp_payment_settings() to service_role;
drop trigger if exists validate_accessrevamp_payment_settings on public.payment_runtime_settings;
create trigger validate_accessrevamp_payment_settings before insert or update on public.payment_runtime_settings for each row execute function public.validate_accessrevamp_payment_settings();

create or replace function public.guard_accessrevamp_checkout_reservation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_enabled boolean;
begin
  select checkout_enabled into v_enabled from public.payment_runtime_settings where singleton = true;
  if coalesce(v_enabled, false) is not true then
    raise exception using errcode = '55000', message = 'AccessRevamp checkout is paused until the secure payment runtime is verified';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_accessrevamp_checkout_reservation() from public, anon, authenticated;
grant execute on function public.guard_accessrevamp_checkout_reservation() to service_role;
drop trigger if exists guard_accessrevamp_checkout_reservation on public.upgrade_reservations;
create trigger guard_accessrevamp_checkout_reservation before insert on public.upgrade_reservations for each row execute function public.guard_accessrevamp_checkout_reservation();

create or replace function public.save_accessrevamp_order_draft(p_user_id uuid, p_request_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
  v_plan text := p_payload ->> 'plan_key';
  v_email text := lower(btrim(p_payload ->> 'email'));
  v_auth_email text;
begin
  if p_user_id is null or p_request_id is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'Order draft identity is invalid';
  end if;
  select lower(email) into v_auth_email from auth.users where id = p_user_id and email_confirmed_at is not null;
  if v_auth_email is null or v_auth_email <> v_email then
    raise exception using errcode = '42501', message = 'Order draft email must match the confirmed account';
  end if;
  if v_plan not in ('homepage_reveal','complete_revamp','cinematic_scroll') then
    raise exception using errcode = '22023', message = 'Order draft plan is invalid';
  end if;
  insert into public.order_drafts (
    user_id, request_id, plan_key, full_name, business_name, website_url, email, phone,
    business_niche, main_goal, requested_pages, integrations, style_direction, content_status,
    desired_launch_date, reference_urls, specific_request, cinematic_direction, status, updated_at
  ) values (
    p_user_id, p_request_id, v_plan, btrim(p_payload ->> 'full_name'), btrim(p_payload ->> 'business_name'),
    btrim(p_payload ->> 'website_url'), v_email, nullif(btrim(p_payload ->> 'phone'), ''),
    btrim(p_payload ->> 'business_niche'), btrim(p_payload ->> 'main_goal'), btrim(p_payload ->> 'requested_pages'),
    coalesce(p_payload ->> 'integrations', ''), btrim(p_payload ->> 'style_direction'), btrim(p_payload ->> 'content_status'),
    nullif(p_payload ->> 'desired_launch_date', '')::date, coalesce(p_payload ->> 'reference_urls', ''),
    coalesce(p_payload ->> 'specific_request', ''), coalesce(p_payload ->> 'cinematic_direction', ''),
    'draft', timezone('utc', now())
  )
  on conflict (user_id, request_id) do update set
    plan_key = excluded.plan_key, full_name = excluded.full_name, business_name = excluded.business_name,
    website_url = excluded.website_url, email = excluded.email, phone = excluded.phone,
    business_niche = excluded.business_niche, main_goal = excluded.main_goal,
    requested_pages = excluded.requested_pages, integrations = excluded.integrations,
    style_direction = excluded.style_direction, content_status = excluded.content_status,
    desired_launch_date = excluded.desired_launch_date, reference_urls = excluded.reference_urls,
    specific_request = excluded.specific_request, cinematic_direction = excluded.cinematic_direction,
    updated_at = timezone('utc', now())
  where public.order_drafts.status in ('draft','expired','canceled')
  returning id into v_id;
  if v_id is null then
    raise exception using errcode = '55000', message = 'Order draft is already attached to an active or paid checkout';
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_accessrevamp_order_draft(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_accessrevamp_order_draft(uuid, uuid, jsonb) to service_role;

create or replace function public.guard_accessrevamp_stripe_event_mode()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_expected boolean;
begin
  select expected_livemode into v_expected from public.payment_runtime_settings where singleton = true;
  if new.id !~ '^evt_[A-Za-z0-9_]+' then raise exception using errcode = '22023', message = 'Stripe event identifier is invalid'; end if;
  if v_expected is null or new.livemode is distinct from v_expected then
    raise exception using errcode = '55000', message = 'Stripe event mode does not match the configured AccessRevamp runtime';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_accessrevamp_stripe_event_mode() from public, anon, authenticated;
grant execute on function public.guard_accessrevamp_stripe_event_mode() to service_role;
drop trigger if exists guard_accessrevamp_stripe_event_mode on public.stripe_events;
create trigger guard_accessrevamp_stripe_event_mode before insert or update of livemode on public.stripe_events for each row execute function public.guard_accessrevamp_stripe_event_mode();

create or replace function public.sync_accessrevamp_project_from_draft()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_order public.orders%rowtype;
  v_draft public.order_drafts%rowtype;
begin
  if new.order_id is null then return new; end if;
  select * into v_order from public.orders where id = new.order_id;
  if not found or v_order.user_id is null or v_order.checkout_request_id is null then return new; end if;
  select * into v_draft from public.order_drafts where user_id = v_order.user_id and request_id = v_order.checkout_request_id for update;
  if not found then return new; end if;
  new.name := left(v_draft.business_name || ' — ' || case v_draft.plan_key when 'homepage_reveal' then 'Homepage Reveal' when 'complete_revamp' then 'Complete Website Revamp' else 'Cinematic Scroll Site' end, 240);
  new.website_url := v_draft.website_url;
  new.scope_summary := left(v_draft.main_goal || case when v_draft.specific_request <> '' then E'\n\n' || v_draft.specific_request else '' end, 8000);
  update public.order_drafts set status = 'paid', order_id = v_order.id, reservation_id = v_order.reservation_id,
    checkout_session_id = v_order.stripe_checkout_session_id, updated_at = timezone('utc', now()) where id = v_draft.id;
  return new;
end;
$$;
revoke all on function public.sync_accessrevamp_project_from_draft() from public, anon, authenticated;
grant execute on function public.sync_accessrevamp_project_from_draft() to service_role;
drop trigger if exists sync_accessrevamp_project_from_draft on public.customer_projects;
create trigger sync_accessrevamp_project_from_draft before insert or update of order_id on public.customer_projects for each row execute function public.sync_accessrevamp_project_from_draft();

create or replace function public.sync_accessrevamp_draft_from_reservation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.order_drafts set reservation_id = new.id,
    checkout_session_id = coalesce(new.checkout_session_id, checkout_session_id),
    status = case new.status when 'checkout_created' then 'checkout_created' when 'expired' then 'expired' when 'canceled' then 'canceled' else status end,
    updated_at = timezone('utc', now())
  where user_id = new.user_id and request_id = new.idempotency_key and status <> 'paid';
  return null;
end;
$$;
revoke all on function public.sync_accessrevamp_draft_from_reservation() from public, anon, authenticated;
grant execute on function public.sync_accessrevamp_draft_from_reservation() to service_role;
drop trigger if exists sync_accessrevamp_draft_from_reservation on public.upgrade_reservations;
create trigger sync_accessrevamp_draft_from_reservation after insert or update of status, checkout_session_id on public.upgrade_reservations for each row execute function public.sync_accessrevamp_draft_from_reservation();

create or replace function public.resolve_accessrevamp_stripe_price(p_transition_key text, p_expected_livemode boolean)
returns table (stripe_price_id text, net_cents integer, currency text)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select catalog.stripe_price_id, catalog.net_cents, catalog.currency
  from public.stripe_price_catalog catalog
  join public.payment_runtime_settings settings on settings.singleton = true
  where catalog.transition_key = p_transition_key and catalog.active = true and catalog.livemode = p_expected_livemode
    and settings.checkout_enabled = true and settings.expected_livemode = p_expected_livemode limit 1;
$$;
revoke all on function public.resolve_accessrevamp_stripe_price(text, boolean) from public, anon, authenticated;
grant execute on function public.resolve_accessrevamp_stripe_price(text, boolean) to service_role;

create or replace function public.create_accessrevamp_refund_authorization(p_refund_request_id uuid, p_operator_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_settings public.payment_runtime_settings%rowtype;
  v_request public.refund_requests%rowtype;
  v_order public.orders%rowtype;
  v_amount integer;
  v_id uuid;
begin
  select * into v_settings from public.payment_runtime_settings where singleton = true for update;
  if not found or v_settings.refunds_enabled is not true or v_settings.require_two_person_refund is not true then
    raise exception using errcode = '55000', message = 'Refund execution is paused or missing two-person approval controls';
  end if;
  if not exists (select 1 from public.accessrevamp_operators where user_id = p_operator_id and active = true) then
    raise exception using errcode = '42501', message = 'Active operator authorization is required';
  end if;
  select * into v_request from public.refund_requests where id = p_refund_request_id for update;
  if not found or v_request.status <> 'requested' then raise exception using errcode = '22023', message = 'Refund request is not eligible for authorization'; end if;
  select * into v_order from public.orders where id = v_request.order_id for update;
  if not found or v_order.status not in ('paid','partially_refunded') then raise exception using errcode = '22023', message = 'Only a settled AccessRevamp order can be refunded'; end if;
  if exists (select 1 from public.customer_projects p where p.order_id = v_order.id and (p.delivered_at is not null or p.status = 'completed' or p.delivery_status = 'delivered')) then
    raise exception using errcode = '55000', message = 'Final digital delivery blocks automated refund execution';
  end if;
  v_amount := coalesce(v_request.refund_amount_cents, v_order.amount_total - v_order.refunded_cents);
  if v_amount <= 0 or v_amount > v_order.amount_total - v_order.refunded_cents or v_amount > v_settings.maximum_single_refund_cents then
    raise exception using errcode = '22023', message = 'Refund amount exceeds the safe remaining limit';
  end if;
  insert into public.refund_authorizations (refund_request_id, order_id, requested_amount_cents, reason, requested_by)
  values (v_request.id, v_order.id, v_amount, v_request.reason, p_operator_id) returning id into v_id;
  insert into public.accessrevamp_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_operator_id, 'refund_authorization_requested', 'refund_authorization', v_id::text, jsonb_build_object('order_id', v_order.id, 'amount_cents', v_amount));
  return v_id;
end;
$$;
revoke all on function public.create_accessrevamp_refund_authorization(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_accessrevamp_refund_authorization(uuid, uuid) to service_role;

create or replace function public.approve_accessrevamp_refund_authorization(p_authorization_id uuid, p_operator_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_authorization public.refund_authorizations%rowtype;
  v_order public.orders%rowtype;
  v_key uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.payment_runtime_settings where singleton = true and refunds_enabled = true and require_two_person_refund = true) then raise exception using errcode = '55000', message = 'Refund execution is paused'; end if;
  if not exists (select 1 from public.accessrevamp_operators where user_id = p_operator_id and active = true) then raise exception using errcode = '42501', message = 'Active operator authorization is required'; end if;
  select * into v_authorization from public.refund_authorizations where id = p_authorization_id for update;
  if not found or v_authorization.status <> 'pending_second_approval' or v_authorization.expires_at <= timezone('utc', now()) then raise exception using errcode = '22023', message = 'Refund authorization is not awaiting approval'; end if;
  if v_authorization.requested_by = p_operator_id then raise exception using errcode = '42501', message = 'A second distinct operator must approve the refund'; end if;
  select * into v_order from public.orders where id = v_authorization.order_id for update;
  if not found or v_order.status not in ('paid','partially_refunded') or v_authorization.requested_amount_cents > v_order.amount_total - v_order.refunded_cents then raise exception using errcode = '22023', message = 'Refund authorization no longer matches the order'; end if;
  if exists (select 1 from public.customer_projects p where p.order_id = v_order.id and (p.delivered_at is not null or p.status = 'completed' or p.delivery_status = 'delivered')) then raise exception using errcode = '55000', message = 'Final digital delivery blocks automated refund execution'; end if;
  update public.refund_authorizations set approved_by = p_operator_id, approved_at = timezone('utc', now()), execution_idempotency_key = v_key, status = 'approved', updated_at = timezone('utc', now()) where id = p_authorization_id;
  update public.refund_requests set status = 'approved', operator_id = p_operator_id, updated_at = timezone('utc', now()) where id = v_authorization.refund_request_id and status = 'requested';
  insert into public.accessrevamp_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_operator_id, 'refund_authorization_approved', 'refund_authorization', p_authorization_id::text, jsonb_build_object('order_id', v_order.id, 'amount_cents', v_authorization.requested_amount_cents));
  return v_key;
end;
$$;
revoke all on function public.approve_accessrevamp_refund_authorization(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_accessrevamp_refund_authorization(uuid, uuid) to service_role;

create or replace function public.claim_accessrevamp_refund_execution(p_authorization_id uuid, p_operator_id uuid)
returns table (authorization_id uuid, order_id uuid, payment_intent_id text, amount_cents integer, reason text, idempotency_key uuid)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_authorization public.refund_authorizations%rowtype;
  v_order public.orders%rowtype;
begin
  if not exists (select 1 from public.payment_runtime_settings where singleton = true and refunds_enabled = true and require_two_person_refund = true) then raise exception using errcode = '55000', message = 'Refund execution is paused'; end if;
  if not exists (select 1 from public.accessrevamp_operators where user_id = p_operator_id and active = true) then raise exception using errcode = '42501', message = 'Active operator authorization is required'; end if;
  select * into v_authorization from public.refund_authorizations where id = p_authorization_id for update;
  if not found or v_authorization.status <> 'approved' or v_authorization.expires_at <= timezone('utc', now()) then raise exception using errcode = '22023', message = 'Refund authorization is not executable'; end if;
  select * into v_order from public.orders where id = v_authorization.order_id for update;
  if not found or v_order.stripe_payment_intent_id is null or v_authorization.requested_amount_cents > v_order.amount_total - v_order.refunded_cents then raise exception using errcode = '22023', message = 'Refund execution no longer matches the order'; end if;
  update public.refund_authorizations set status = 'executing', executed_by = p_operator_id, execution_started_at = timezone('utc', now()), updated_at = timezone('utc', now()) where id = p_authorization_id;
  update public.refund_requests set status = 'processing', operator_id = p_operator_id, updated_at = timezone('utc', now()) where id = v_authorization.refund_request_id and status = 'approved';
  insert into public.accessrevamp_audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_operator_id, 'refund_execution_claimed', 'refund_authorization', p_authorization_id::text, jsonb_build_object('order_id', v_order.id, 'amount_cents', v_authorization.requested_amount_cents));
  return query select v_authorization.id, v_order.id, v_order.stripe_payment_intent_id, v_authorization.requested_amount_cents, v_authorization.reason, v_authorization.execution_idempotency_key;
end;
$$;
revoke all on function public.claim_accessrevamp_refund_execution(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_accessrevamp_refund_execution(uuid, uuid) to service_role;

create or replace function public.attach_accessrevamp_refund_provider(p_authorization_id uuid, p_stripe_refund_id text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_stripe_refund_id !~ '^re_[A-Za-z0-9_]+$' then raise exception using errcode = '22023', message = 'Stripe refund identifier is invalid'; end if;
  update public.refund_authorizations set stripe_refund_id = p_stripe_refund_id, updated_at = timezone('utc', now()) where id = p_authorization_id and status = 'executing' and stripe_refund_id is null;
  if not found then raise exception using errcode = '55000', message = 'Refund provider result could not be attached'; end if;
  return true;
end;
$$;
revoke all on function public.attach_accessrevamp_refund_provider(uuid, text) from public, anon, authenticated;
grant execute on function public.attach_accessrevamp_refund_provider(uuid, text) to service_role;

create or replace function public.fail_accessrevamp_refund_execution(p_authorization_id uuid, p_message text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_request_id uuid;
begin
  update public.refund_authorizations set status = 'approved', failure_message = left(coalesce(p_message, 'Provider refund attempt failed'), 500), executed_by = null, execution_started_at = null, updated_at = timezone('utc', now())
  where id = p_authorization_id and status = 'executing' returning refund_request_id into v_request_id;
  if not found then return false; end if;
  update public.refund_requests set status = 'approved', updated_at = timezone('utc', now()) where id = v_request_id and status = 'processing';
  insert into public.payment_security_incidents (dedupe_key, incident_type, severity, details)
  values ('refund-execution-failed:' || p_authorization_id::text, 'webhook_failure', 'critical', jsonb_build_object('authorization_id', p_authorization_id, 'message', left(coalesce(p_message, ''), 500)))
  on conflict (dedupe_key) do update set last_seen_at = timezone('utc', now()), details = excluded.details, status = case when public.payment_security_incidents.status = 'resolved' then 'open' else public.payment_security_incidents.status end;
  return true;
end;
$$;
revoke all on function public.fail_accessrevamp_refund_execution(uuid, text) from public, anon, authenticated;
grant execute on function public.fail_accessrevamp_refund_execution(uuid, text) to service_role;

create or replace function public.classify_accessrevamp_refund()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_authorization public.refund_authorizations%rowtype;
begin
  select * into v_authorization from public.refund_authorizations
  where stripe_refund_id = new.stripe_refund_id or (order_id = new.order_id and status = 'executing' and execution_started_at >= timezone('utc', now()) - interval '30 minutes' and requested_amount_cents <= new.cumulative_refunded_cents)
  order by case when stripe_refund_id = new.stripe_refund_id then 0 else 1 end, created_at desc limit 1 for update;
  if found then
    new.authorization_id := v_authorization.id; new.authorized := true; new.origin := 'operator_approved';
    update public.refund_authorizations set status = case when new.status = 'succeeded' then 'executed' else status end,
      stripe_refund_id = case when new.stripe_refund_id ~ '^re_[A-Za-z0-9_]+' then new.stripe_refund_id else stripe_refund_id end,
      executed_at = case when new.status = 'succeeded' then timezone('utc', now()) else executed_at end,
      updated_at = timezone('utc', now()) where id = v_authorization.id;
  else
    new.authorization_id := null; new.authorized := false;
    new.origin := case when new.origin = 'dashboard_manual' then 'dashboard_manual' else 'provider_event' end;
  end if;
  return new;
end;
$$;
revoke all on function public.classify_accessrevamp_refund() from public, anon, authenticated;
grant execute on function public.classify_accessrevamp_refund() to service_role;
drop trigger if exists classify_accessrevamp_refund on public.payment_refunds;
create trigger classify_accessrevamp_refund before insert or update of stripe_refund_id, cumulative_refunded_cents, status on public.payment_refunds for each row execute function public.classify_accessrevamp_refund();

create or replace function public.pause_on_unauthorized_accessrevamp_refund()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.status = 'succeeded' and new.authorized is not true then
    insert into public.payment_security_incidents (dedupe_key, incident_type, severity, order_id, stripe_object_id, details)
    values ('unauthorized-refund:' || new.stripe_refund_id, 'unauthorized_refund', 'critical', new.order_id, new.stripe_refund_id,
      jsonb_build_object('refund_amount_cents', new.refund_amount_cents, 'cumulative_refunded_cents', new.cumulative_refunded_cents, 'origin', new.origin))
    on conflict (dedupe_key) do update set last_seen_at = timezone('utc', now()), details = excluded.details,
      status = case when public.payment_security_incidents.status = 'resolved' then 'open' else public.payment_security_incidents.status end;
    update public.payment_runtime_settings set refunds_enabled = false,
      maintenance_reason = 'Refund execution paused automatically after an unapproved provider refund.', updated_at = timezone('utc', now()) where singleton = true;
    insert into public.accessrevamp_audit_log (action, entity_type, entity_id, details)
    values ('unauthorized_refund_detected', 'order', new.order_id::text, jsonb_build_object('stripe_refund_id', new.stripe_refund_id, 'amount_cents', new.refund_amount_cents));
  end if;
  return null;
end;
$$;
revoke all on function public.pause_on_unauthorized_accessrevamp_refund() from public, anon, authenticated;
grant execute on function public.pause_on_unauthorized_accessrevamp_refund() to service_role;
drop trigger if exists pause_on_unauthorized_accessrevamp_refund on public.payment_refunds;
create trigger pause_on_unauthorized_accessrevamp_refund after insert or update of authorized, status on public.payment_refunds for each row execute function public.pause_on_unauthorized_accessrevamp_refund();

create or replace function public.audit_accessrevamp_guardrail_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.accessrevamp_audit_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'payment_guardrail_changed', tg_table_name,
    coalesce((to_jsonb(new)->>'id'), (to_jsonb(new)->>'transition_key'), 'singleton'),
    jsonb_build_object('operation', tg_op, 'old', case when tg_op <> 'INSERT' then to_jsonb(old) else null end, 'new', case when tg_op <> 'DELETE' then to_jsonb(new) else null end));
  return null;
end;
$$;
revoke all on function public.audit_accessrevamp_guardrail_change() from public, anon, authenticated;
grant execute on function public.audit_accessrevamp_guardrail_change() to service_role;
drop trigger if exists audit_payment_runtime_settings on public.payment_runtime_settings;
create trigger audit_payment_runtime_settings after insert or update or delete on public.payment_runtime_settings for each row execute function public.audit_accessrevamp_guardrail_change();
drop trigger if exists audit_stripe_price_catalog on public.stripe_price_catalog;
create trigger audit_stripe_price_catalog after insert or update or delete on public.stripe_price_catalog for each row execute function public.audit_accessrevamp_guardrail_change();
drop trigger if exists audit_refund_authorizations on public.refund_authorizations;
create trigger audit_refund_authorizations after insert or update or delete on public.refund_authorizations for each row execute function public.audit_accessrevamp_guardrail_change();
