-- AccessRevamp workflow functions, payment hydration, and private approvals.

create or replace function public.validate_accessrevamp_security_finding()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_authorization public.project_security_authorizations%rowtype;
begin
  if new.audit_type <> 'authorized_active_security' then return new; end if;
  if new.security_authorization_id is null then raise exception 'Active security testing requires an authorization record'; end if;

  select * into v_authorization
  from public.project_security_authorizations
  where id = new.security_authorization_id
    and project_id = new.project_id
    and status = 'active'
    and valid_from <= timezone('utc', now())
    and valid_until > timezone('utc', now());
  if not found then raise exception 'Active security authorization is missing, expired, revoked, or for a different project'; end if;
  return new;
end;
$$;
drop trigger if exists validate_accessrevamp_security_finding_trigger on public.project_findings;
create trigger validate_accessrevamp_security_finding_trigger
before insert or update of project_id, audit_type, security_authorization_id
on public.project_findings
for each row execute function public.validate_accessrevamp_security_finding();

create or replace function public.advance_accessrevamp_workflow(p_workflow_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_task public.project_workflow_tasks%rowtype;
  v_required_remaining integer;
  v_required_failed integer;
  v_next_status text;
begin
  select count(*) into v_required_failed
  from public.project_workflow_tasks
  where workflow_id = p_workflow_id and required and status = 'failed';
  if v_required_failed > 0 then
    update public.project_workflows set status = 'blocked', updated_at = timezone('utc', now()) where id = p_workflow_id;
    return 'blocked';
  end if;

  select count(*) into v_required_remaining
  from public.project_workflow_tasks
  where workflow_id = p_workflow_id and required and status not in ('succeeded','skipped','canceled');
  if v_required_remaining = 0 then
    update public.project_workflows
       set status = 'completed', completed_at = coalesce(completed_at, timezone('utc', now())), updated_at = timezone('utc', now())
     where id = p_workflow_id;
    return 'completed';
  end if;

  select * into v_task
  from public.project_workflow_tasks
  where workflow_id = p_workflow_id and status not in ('succeeded','skipped','canceled')
  order by sequence_number, created_at
  limit 1
  for update;
  if not found then return 'idle'; end if;

  if v_task.status = 'blocked' then
    v_next_status := case v_task.activation_mode
      when 'automatic' then 'queued'
      when 'customer' then 'waiting_customer'
      when 'integration' then 'waiting_integration'
      else 'blocked'
    end;
    update public.project_workflow_tasks set status = v_next_status, updated_at = timezone('utc', now()) where id = v_task.id;
  else
    v_next_status := v_task.status;
  end if;

  update public.project_workflows
     set status = case
                    when v_next_status = 'waiting_customer' then 'waiting_customer'
                    when v_next_status = 'waiting_integration' then 'waiting_integration'
                    when v_next_status = 'failed' then 'blocked'
                    else 'running'
                  end,
         current_stage = v_task.stage,
         started_at = coalesce(started_at, timezone('utc', now())),
         updated_at = timezone('utc', now())
   where id = p_workflow_id;
  return v_next_status;
end;
$$;

create or replace function public.bootstrap_accessrevamp_project_workflow(p_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_project public.customer_projects%rowtype;
  v_order public.orders%rowtype;
  v_template public.accessrevamp_workflow_templates%rowtype;
  v_workflow_id uuid;
  v_task jsonb;
  v_scene_budget integer;
  v_drive_task_id uuid;
begin
  select * into v_project from public.customer_projects where id = p_project_id;
  if not found then raise exception 'Customer project not found'; end if;
  if v_project.order_id is null then return null; end if;

  select * into v_order from public.orders where id = v_project.order_id;
  if not found or v_order.status <> 'paid' then return null; end if;
  select * into v_template from public.accessrevamp_workflow_templates where plan_key = v_project.plan_key;
  if not found then raise exception 'Workflow template not found for %', v_project.plan_key; end if;

  insert into public.project_workflows (project_id, order_id, plan_key, status, current_stage, cinematic_scene_count, revision_round)
  values (v_project.id, v_project.order_id, v_project.plan_key, 'queued', 'payment_reconciliation', v_project.cinematic_scene_count, 0)
  on conflict (project_id) do update set
    order_id = excluded.order_id,
    plan_key = excluded.plan_key,
    cinematic_scene_count = coalesce(excluded.cinematic_scene_count, public.project_workflows.cinematic_scene_count),
    updated_at = timezone('utc', now())
  returning id into v_workflow_id;

  for v_task in select value from jsonb_array_elements(v_template.task_manifest)
  loop
    insert into public.project_workflow_tasks (
      workflow_id, sequence_number, task_key, stage, assigned_agent, status, activation_mode,
      required, revision_round, idempotency_key, input_payload
    ) values (
      v_workflow_id,
      (v_task ->> 'sequence')::integer,
      v_task ->> 'task_key',
      v_task ->> 'stage',
      v_task ->> 'agent',
      case when (v_task ->> 'sequence')::integer = 1 then 'queued' else 'blocked' end,
      case v_task ->> 'status' when 'waiting_customer' then 'customer' when 'waiting_integration' then 'integration' else 'automatic' end,
      coalesce((v_task ->> 'required')::boolean, true),
      0,
      v_workflow_id::text || ':' || (v_task ->> 'task_key') || ':0',
      v_task - array['sequence','task_key','stage','agent','status','required']
    )
    on conflict (workflow_id, task_key, revision_round) do update set
      sequence_number = excluded.sequence_number,
      stage = excluded.stage,
      assigned_agent = excluded.assigned_agent,
      activation_mode = excluded.activation_mode,
      required = excluded.required,
      input_payload = excluded.input_payload,
      updated_at = timezone('utc', now());
  end loop;

  select id into v_drive_task_id
  from public.project_workflow_tasks
  where workflow_id = v_workflow_id and task_key = 'create_customer_folder' and revision_round = 0;

  insert into public.project_portfolio_consents (project_id, consent_granted, consent_scope, consented_at)
  values (
    v_project.id,
    coalesce(v_project.portfolio_consent, false),
    case when v_project.portfolio_consent then 'anonymous_screenshots' else 'none' end,
    case when v_project.portfolio_consent then coalesce(v_project.portfolio_consent_at, timezone('utc', now())) else null end
  )
  on conflict (project_id) do update set
    consent_granted = excluded.consent_granted,
    consent_scope = excluded.consent_scope,
    consented_at = excluded.consented_at,
    revoked_at = case when excluded.consent_granted then null else public.project_portfolio_consents.revoked_at end,
    updated_at = timezone('utc', now());

  if v_project.plan_key = 'cinematic_scroll' then
    v_scene_budget := case v_project.cinematic_scene_count when 3 then 150 when 4 then 200 else 0 end;
    insert into public.project_provider_budgets (project_id, provider, budget_key, limit_units, unit_name, status)
    values (v_project.id, 'higgsfield', 'cinematic_scene_generation', v_scene_budget, 'credits', case when v_scene_budget > 0 then 'active' else 'paused' end)
    on conflict (project_id, provider, budget_key) do update set
      limit_units = excluded.limit_units,
      status = excluded.status,
      updated_at = timezone('utc', now());
  end if;

  insert into public.accessrevamp_integration_outbox (project_id, workflow_id, task_id, provider, operation, idempotency_key, payload)
  values (
    v_project.id, v_workflow_id, v_drive_task_id, 'google_drive', 'create_customer_folder',
    'drive-folder:' || v_project.id::text,
    jsonb_build_object(
      'parent_folder_id', (select drive_customers_folder_id from public.accessrevamp_agent_settings where singleton = true),
      'project_id', v_project.id,
      'order_id', v_project.order_id,
      'business_name', v_project.name,
      'website_url', v_project.website_url,
      'plan_key', v_project.plan_key
    )
  )
  on conflict (idempotency_key) do update set task_id = excluded.task_id, updated_at = timezone('utc', now());

  insert into public.accessrevamp_integration_outbox (project_id, workflow_id, provider, operation, idempotency_key, payload)
  values (
    v_project.id, v_workflow_id, 'google_sheets', 'append_payment_ledger',
    'payment-ledger:' || v_order.id::text,
    jsonb_build_object(
      'spreadsheet_id', (select drive_payment_ledger_id from public.accessrevamp_agent_settings where singleton = true),
      'order_id', v_order.id,
      'checkout_request_id', v_order.checkout_request_id,
      'project_id', v_project.id,
      'customer_email', v_order.customer_email,
      'business_name', v_project.name,
      'website_url', v_project.website_url,
      'plan_key', v_order.plan_key,
      'amount_cents', v_order.amount_total,
      'stripe_checkout_session_id', v_order.stripe_checkout_session_id,
      'stripe_payment_intent_id', v_order.stripe_payment_intent_id,
      'stripe_event_id', v_order.stripe_event_id,
      'status', v_order.status
    )
  ) on conflict (idempotency_key) do nothing;

  perform public.advance_accessrevamp_workflow(v_workflow_id);
  return v_workflow_id;
end;
$$;

create or replace function public.bootstrap_accessrevamp_project_workflow_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform public.bootstrap_accessrevamp_project_workflow(new.id);
  return new;
end;
$$;
drop trigger if exists bootstrap_accessrevamp_project_workflow_on_project on public.customer_projects;
create trigger bootstrap_accessrevamp_project_workflow_on_project
after insert or update of order_id, plan_key, cinematic_scene_count, portfolio_consent
on public.customer_projects
for each row execute function public.bootstrap_accessrevamp_project_workflow_trigger();

create or replace function public.claim_accessrevamp_workflow_tasks(p_agent text, p_limit integer default 1)
returns setof public.project_workflow_tasks
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_limit < 1 or p_limit > 20 then raise exception 'Invalid task claim limit'; end if;
  if p_agent not in ('main_agent','customer_agent','website_agent','design_agent','security_agent','integration_worker') then raise exception 'Unknown agent'; end if;
  if not exists (select 1 from public.accessrevamp_agent_settings where singleton = true and orchestration_enabled) then return; end if;

  return query
  with candidates as (
    select t.id
    from public.project_workflow_tasks t
    join public.project_workflows w on w.id = t.workflow_id
    where t.assigned_agent = p_agent and t.status = 'queued' and w.status in ('queued','running')
    order by t.sequence_number, t.created_at
    for update of t skip locked
    limit p_limit
  )
  update public.project_workflow_tasks t
     set status = 'running', attempt_count = t.attempt_count + 1,
         started_at = coalesce(t.started_at, timezone('utc', now())), updated_at = timezone('utc', now())
  from candidates c where t.id = c.id
  returning t.*;
end;
$$;

create or replace function public.complete_accessrevamp_workflow_task(
  p_task_id uuid,
  p_success boolean,
  p_output jsonb default '{}'::jsonb,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_workflow_id uuid;
  v_task_required boolean;
begin
  update public.project_workflow_tasks
     set status = case when p_success then 'succeeded' else 'failed' end,
         output_payload = coalesce(p_output, '{}'::jsonb),
         last_error = case when p_success then null else left(coalesce(p_error, 'Task failed'), 4000) end,
         completed_at = timezone('utc', now()),
         updated_at = timezone('utc', now())
   where id = p_task_id and status in ('running','waiting_customer','waiting_integration')
  returning workflow_id, required into v_workflow_id, v_task_required;
  if v_workflow_id is null then return false; end if;

  if not p_success and v_task_required then
    update public.project_workflows
       set status = 'blocked', last_error = left(coalesce(p_error, 'Required task failed'), 4000), updated_at = timezone('utc', now())
     where id = v_workflow_id;
  else
    perform public.advance_accessrevamp_workflow(v_workflow_id);
  end if;
  return true;
end;
$$;

create or replace function public.claim_accessrevamp_integration_work(p_provider text, p_worker text, p_limit integer default 5)
returns setof public.accessrevamp_integration_outbox
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_limit < 1 or p_limit > 20 then raise exception 'Invalid integration claim limit'; end if;
  if p_provider not in ('google_drive','google_sheets','gmail','icemail','stripe','supabase','canva','higgsfield','netlify','github') then raise exception 'Unknown integration provider'; end if;

  if p_provider in ('gmail','icemail') and not exists (
    select 1 from public.accessrevamp_agent_settings where singleton = true and external_email_transport_enabled
  ) then return; end if;
  if p_provider in ('canva','higgsfield') and not exists (
    select 1 from public.accessrevamp_agent_settings where singleton = true and external_creative_generation_enabled
  ) then return; end if;

  return query
  with candidates as (
    select o.id from public.accessrevamp_integration_outbox o
    where o.provider = p_provider and o.status in ('pending','retry')
      and o.next_attempt_at <= timezone('utc', now()) and o.attempt_count < o.maximum_attempts
    order by o.created_at
    for update of o skip locked
    limit p_limit
  )
  update public.accessrevamp_integration_outbox o
     set status = 'claimed', attempt_count = o.attempt_count + 1,
         claimed_by = left(p_worker, 160), claimed_at = timezone('utc', now()), updated_at = timezone('utc', now())
  from candidates c where o.id = c.id
  returning o.*;
end;
$$;

create or replace function public.complete_accessrevamp_integration_work(
  p_outbox_id uuid,
  p_success boolean,
  p_external_id text default null,
  p_result_url text default null,
  p_result jsonb default '{}'::jsonb,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_attempts smallint;
  v_maximum smallint;
  v_task_id uuid;
begin
  select attempt_count, maximum_attempts, task_id into v_attempts, v_maximum, v_task_id
  from public.accessrevamp_integration_outbox
  where id = p_outbox_id and status = 'claimed'
  for update;
  if not found then return false; end if;

  update public.accessrevamp_integration_outbox
     set status = case when p_success then 'succeeded' when v_attempts >= v_maximum then 'failed' else 'retry' end,
         external_id = coalesce(p_external_id, external_id),
         result_url = coalesce(p_result_url, result_url),
         result_payload = coalesce(p_result, '{}'::jsonb),
         last_error = case when p_success then null else left(coalesce(p_error, 'Integration failed'), 4000) end,
         next_attempt_at = case when p_success then next_attempt_at else timezone('utc', now()) + make_interval(mins => least(60, greatest(1, v_attempts * 5))) end,
         updated_at = timezone('utc', now())
   where id = p_outbox_id;

  if v_task_id is not null then
    if p_success then
      perform public.complete_accessrevamp_workflow_task(v_task_id, true, jsonb_build_object('external_id',p_external_id,'result_url',p_result_url,'result',p_result), null);
    elsif v_attempts >= v_maximum then
      perform public.complete_accessrevamp_workflow_task(v_task_id, false, '{}'::jsonb, p_error);
    end if;
  end if;
  return true;
end;
$$;

create or replace function public.submit_accessrevamp_project_approval(
  p_token_hash text,
  p_selected_option_ids uuid[] default '{}',
  p_customer_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_link public.project_approval_links%rowtype;
  v_existing public.project_approval_selections%rowtype;
  v_expected_count integer;
  v_matching_count integer;
  v_selection_id uuid;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception using errcode = '22023', message = 'Approval token is invalid'; end if;
  if coalesce(array_length(p_selected_option_ids, 1), 0) > 20 then raise exception using errcode = '22023', message = 'Too many approval options were submitted'; end if;
  if char_length(coalesce(p_customer_notes, '')) > 2000 then raise exception using errcode = '22023', message = 'Approval notes are too long'; end if;

  select * into v_link from public.project_approval_links where token_hash = p_token_hash for update;
  if not found then raise exception using errcode = 'P0002', message = 'Approval link was not found'; end if;

  if v_link.status = 'used' then
    select * into v_existing from public.project_approval_selections where approval_link_id = v_link.id;
    if found and v_existing.selected_option_ids = coalesce(p_selected_option_ids, '{}') then
      return jsonb_build_object('ok',true,'duplicate',true,'project_id',v_link.project_id,'purpose',v_link.purpose,'selection_id',v_existing.id);
    end if;
    raise exception using errcode = '55000', message = 'Approval link has already been used';
  end if;
  if v_link.status <> 'active' then raise exception using errcode = '55000', message = 'Approval link is not active'; end if;
  if v_link.expires_at <= timezone('utc', now()) then
    update public.project_approval_links set status = 'expired', updated_at = timezone('utc', now()) where id = v_link.id;
    raise exception using errcode = '55000', message = 'Approval link has expired';
  end if;

  v_expected_count := case when v_link.purpose in ('homepage_selection','revision_selection','cinematic_sequence_selection','scene_selection') then 1 else 0 end;
  if coalesce(array_length(p_selected_option_ids, 1), 0) <> v_expected_count then raise exception using errcode = '22023', message = 'Choose the required number of options'; end if;

  if v_expected_count > 0 then
    select count(*) into v_matching_count from public.project_design_options
    where project_id = v_link.project_id and id = any(p_selected_option_ids) and status in ('customer_ready','selected');
    if v_matching_count <> v_expected_count then raise exception using errcode = '22023', message = 'Selected option is not available for this project'; end if;
  end if;

  insert into public.project_approval_selections (approval_link_id, project_id, selected_option_ids, customer_notes)
  values (v_link.id, v_link.project_id, coalesce(p_selected_option_ids, '{}'), nullif(btrim(coalesce(p_customer_notes, '')), ''))
  returning id into v_selection_id;

  if v_expected_count > 0 then
    update public.project_design_options
       set status = 'selected', customer_selected_at = timezone('utc', now()), updated_at = timezone('utc', now())
     where project_id = v_link.project_id and id = any(p_selected_option_ids);
  end if;

  update public.project_approval_links
     set status = 'used', used_at = timezone('utc', now()), updated_at = timezone('utc', now())
   where id = v_link.id;

  if v_link.task_id is not null then
    perform public.complete_accessrevamp_workflow_task(
      v_link.task_id, true,
      jsonb_build_object('approval_link_id',v_link.id,'selection_id',v_selection_id,'selected_option_ids',coalesce(p_selected_option_ids,'{}')),
      null
    );
  end if;

  return jsonb_build_object('ok',true,'duplicate',false,'project_id',v_link.project_id,'purpose',v_link.purpose,'selection_id',v_selection_id);
end;
$$;

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
  v_scene_count smallint;
  v_portfolio_consent boolean := coalesce((p_payload ->> 'portfolio_consent')::boolean, false);
begin
  if p_user_id is null or p_request_id is null or jsonb_typeof(p_payload) <> 'object' then raise exception using errcode = '22023', message = 'Order draft identity is invalid'; end if;
  select lower(email) into v_auth_email from auth.users where id = p_user_id and email_confirmed_at is not null;
  if v_auth_email is null or v_auth_email <> v_email then raise exception using errcode = '42501', message = 'Order draft email must match the confirmed account'; end if;
  if v_plan not in ('homepage_reveal','complete_revamp','cinematic_scroll') then raise exception using errcode = '22023', message = 'Order draft plan is invalid'; end if;

  if nullif(p_payload ->> 'cinematic_scene_count', '') is not null then v_scene_count := (p_payload ->> 'cinematic_scene_count')::smallint; end if;
  if v_plan = 'cinematic_scroll' and v_scene_count not in (3,4) then raise exception using errcode = '22023', message = 'Choose three or four cinematic scenes'; end if;
  if v_plan <> 'cinematic_scroll' then v_scene_count := null; end if;

  insert into public.order_drafts (
    user_id, request_id, plan_key, full_name, business_name, website_url, email, phone,
    business_niche, main_goal, requested_pages, integrations, style_direction, content_status,
    desired_launch_date, reference_urls, specific_request, cinematic_direction,
    cinematic_scene_count, portfolio_consent, portfolio_consent_at, status, updated_at
  ) values (
    p_user_id, p_request_id, v_plan, btrim(p_payload ->> 'full_name'), btrim(p_payload ->> 'business_name'),
    btrim(p_payload ->> 'website_url'), v_email, nullif(btrim(p_payload ->> 'phone'), ''),
    btrim(p_payload ->> 'business_niche'), btrim(p_payload ->> 'main_goal'), btrim(p_payload ->> 'requested_pages'),
    coalesce(p_payload ->> 'integrations', ''), btrim(p_payload ->> 'style_direction'), btrim(p_payload ->> 'content_status'),
    nullif(p_payload ->> 'desired_launch_date', '')::date, coalesce(p_payload ->> 'reference_urls', ''),
    coalesce(p_payload ->> 'specific_request', ''), coalesce(p_payload ->> 'cinematic_direction', ''),
    v_scene_count, v_portfolio_consent, case when v_portfolio_consent then timezone('utc', now()) else null end,
    'draft', timezone('utc', now())
  )
  on conflict (user_id, request_id) do update set
    plan_key = excluded.plan_key, full_name = excluded.full_name, business_name = excluded.business_name,
    website_url = excluded.website_url, email = excluded.email, phone = excluded.phone,
    business_niche = excluded.business_niche, main_goal = excluded.main_goal, requested_pages = excluded.requested_pages,
    integrations = excluded.integrations, style_direction = excluded.style_direction, content_status = excluded.content_status,
    desired_launch_date = excluded.desired_launch_date, reference_urls = excluded.reference_urls,
    specific_request = excluded.specific_request, cinematic_direction = excluded.cinematic_direction,
    cinematic_scene_count = excluded.cinematic_scene_count, portfolio_consent = excluded.portfolio_consent,
    portfolio_consent_at = case
      when excluded.portfolio_consent and not public.order_drafts.portfolio_consent then timezone('utc', now())
      when excluded.portfolio_consent then public.order_drafts.portfolio_consent_at
      else null
    end,
    updated_at = timezone('utc', now())
  where public.order_drafts.status in ('draft','expired','canceled')
  returning id into v_id;

  if v_id is null then raise exception using errcode = '55000', message = 'Order draft is already attached to an active or paid checkout'; end if;
  return v_id;
end;
$$;

create or replace function public.sync_accessrevamp_order_draft_from_order()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status = 'paid' and new.checkout_request_id is not null then
    update public.order_drafts
       set status = 'paid', order_id = new.id, updated_at = timezone('utc', now())
     where user_id = new.user_id and request_id = new.checkout_request_id and status in ('draft','checkout_created','paid');
  end if;
  return new;
end;
$$;
drop trigger if exists sync_accessrevamp_order_draft_from_order_trigger on public.orders;
create trigger sync_accessrevamp_order_draft_from_order_trigger
after insert or update of status, checkout_request_id on public.orders
for each row execute function public.sync_accessrevamp_order_draft_from_order();

create or replace function public.hydrate_accessrevamp_project_from_order_draft()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_draft public.order_drafts%rowtype;
begin
  if new.order_id is null then return new; end if;
  select d.* into v_draft
  from public.orders o
  join public.order_drafts d on d.user_id = o.user_id and d.request_id = o.checkout_request_id
  where o.id = new.order_id
  order by d.updated_at desc
  limit 1;
  if found then
    new.name := coalesce(nullif(v_draft.business_name, ''), new.name);
    new.website_url := coalesce(nullif(v_draft.website_url, ''), new.website_url);
    new.cinematic_scene_count := case when new.plan_key = 'cinematic_scroll' then v_draft.cinematic_scene_count else null end;
    new.portfolio_consent := coalesce(v_draft.portfolio_consent, false);
    new.portfolio_consent_at := case when v_draft.portfolio_consent then v_draft.portfolio_consent_at else null end;
    new.revision_limit := 2;
  end if;
  return new;
end;
$$;
drop trigger if exists hydrate_accessrevamp_project_from_order_draft_trigger on public.customer_projects;
create trigger hydrate_accessrevamp_project_from_order_draft_trigger
before insert or update of order_id, plan_key on public.customer_projects
for each row execute function public.hydrate_accessrevamp_project_from_order_draft();

revoke all on function public.validate_accessrevamp_security_finding() from public, anon, authenticated;
revoke all on function public.advance_accessrevamp_workflow(uuid) from public, anon, authenticated;
revoke all on function public.bootstrap_accessrevamp_project_workflow(uuid) from public, anon, authenticated;
revoke all on function public.bootstrap_accessrevamp_project_workflow_trigger() from public, anon, authenticated;
revoke all on function public.claim_accessrevamp_workflow_tasks(text, integer) from public, anon, authenticated;
revoke all on function public.complete_accessrevamp_workflow_task(uuid, boolean, jsonb, text) from public, anon, authenticated;
revoke all on function public.claim_accessrevamp_integration_work(text, text, integer) from public, anon, authenticated;
revoke all on function public.complete_accessrevamp_integration_work(uuid, boolean, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.submit_accessrevamp_project_approval(text, uuid[], text) from public, anon, authenticated;
revoke all on function public.sync_accessrevamp_order_draft_from_order() from public, anon, authenticated;
revoke all on function public.hydrate_accessrevamp_project_from_order_draft() from public, anon, authenticated;

grant execute on function public.advance_accessrevamp_workflow(uuid) to service_role;
grant execute on function public.bootstrap_accessrevamp_project_workflow(uuid) to service_role;
grant execute on function public.claim_accessrevamp_workflow_tasks(text, integer) to service_role;
grant execute on function public.complete_accessrevamp_workflow_task(uuid, boolean, jsonb, text) to service_role;
grant execute on function public.claim_accessrevamp_integration_work(text, text, integer) to service_role;
grant execute on function public.complete_accessrevamp_integration_work(uuid, boolean, text, text, jsonb, text) to service_role;
grant execute on function public.submit_accessrevamp_project_approval(text, uuid[], text) to service_role;

comment on function public.submit_accessrevamp_project_approval(text, uuid[], text) is 'Atomically validates a hashed expiring approval link, records one bounded selection, and advances its task.';
