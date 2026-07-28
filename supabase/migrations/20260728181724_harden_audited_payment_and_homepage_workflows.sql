begin;

-- An abandoned Checkout Session is not proof that the webhook transport is
-- down. Reconcile stale unpaid state, then use the durable checkout/webhook
-- timestamps to raise a focused incident only when a reconciled checkout has
-- no newer successful webhook observation.
create or replace function public.enforce_accessrevamp_webhook_liveness()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reconciled integer;
  v_settings public.payment_runtime_settings%rowtype;
  v_webhook_liveness_unconfirmed boolean := false;
begin
  v_reconciled := public.reconcile_accessrevamp_stale_unpaid_checkouts();

  select settings.*
    into v_settings
    from public.payment_runtime_settings settings
   where settings.singleton = true;

  if not found then
    return false;
  end if;

  v_webhook_liveness_unconfirmed :=
    v_reconciled > 0
    and v_settings.last_checkout_created_at is not null
    and (
      v_settings.last_successful_webhook_at is null
      or v_settings.last_successful_webhook_at < v_settings.last_checkout_created_at
    );

  if v_webhook_liveness_unconfirmed then
    insert into public.payment_security_incidents (
      dedupe_key,
      incident_type,
      severity,
      details
    ) values (
      'webhook_liveness_unconfirmed',
      'webhook_failure',
      'warning',
      pg_catalog.jsonb_build_object(
        'reconciled_checkout_count', v_reconciled,
        'last_checkout_created_at', v_settings.last_checkout_created_at,
        'last_successful_webhook_at', v_settings.last_successful_webhook_at,
        'detected_at', pg_catalog.timezone('utc', pg_catalog.now()),
        'action', 'operator_review_without_global_checkout_pause'
      )
    )
    on conflict (dedupe_key) do update
      set status = 'open',
          severity = excluded.severity,
          last_seen_at = pg_catalog.timezone('utc', pg_catalog.now()),
          resolved_at = null,
          details = excluded.details;
  elsif v_settings.last_successful_webhook_at is not null
        and (
          v_settings.last_checkout_created_at is null
          or v_settings.last_successful_webhook_at >= v_settings.last_checkout_created_at
        ) then
    update public.payment_security_incidents
       set status = 'resolved',
           resolved_at = pg_catalog.coalesce(
             resolved_at,
             pg_catalog.timezone('utc', pg_catalog.now())
           ),
           last_seen_at = pg_catalog.timezone('utc', pg_catalog.now()),
           details = details || pg_catalog.jsonb_build_object(
             'resolution', 'newer_successful_webhook_observed',
             'resolved_at', pg_catalog.timezone('utc', pg_catalog.now())
           )
     where dedupe_key = 'webhook_liveness_unconfirmed'
       and status in ('open', 'investigating');
  end if;

  return v_webhook_liveness_unconfirmed;
end;
$$;

revoke all on function public.enforce_accessrevamp_webhook_liveness()
  from public, anon, authenticated;
grant execute on function public.enforce_accessrevamp_webhook_liveness()
  to service_role;

-- Complete a selection only from eligible, non-rejected durable feedback.
create or replace function accessrevamp_private.complete_accessrevamp_homepage_selection_from_feedback(
  p_feedback_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  feedback public.customer_project_feedback%rowtype;
  selection_task_id uuid;
begin
  select feedback_row.*
    into feedback
    from public.customer_project_feedback feedback_row
   where feedback_row.id = p_feedback_id;

  if not found
     or feedback.action <> 'select_designs'
     or feedback.status = 'rejected'
     or pg_catalog.cardinality(feedback.selected_option_ids) not between 1 and 3
     or feedback.revision_round <> 0 then
    return false;
  end if;

  select selection_task.id
    into selection_task_id
    from public.project_workflow_tasks selection_task
    join public.project_workflows workflow
      on workflow.id = selection_task.workflow_id
    join public.orders paid_order
      on paid_order.id = workflow.order_id
     and paid_order.status = 'paid'
   where workflow.project_id = feedback.project_id
     and workflow.plan_key = 'homepage_reveal'
     and selection_task.task_key = 'customer_homepage_selection'
     and selection_task.status = 'waiting_customer'
     and selection_task.revision_round = 0
   for update of selection_task;

  if selection_task_id is null then
    return false;
  end if;

  perform public.complete_accessrevamp_workflow_task(
    selection_task_id,
    true,
    pg_catalog.jsonb_build_object(
      'feedback_id', feedback.id,
      'selected_option_ids', pg_catalog.to_jsonb(feedback.selected_option_ids),
      'primary_design_option_id', feedback.selected_option_ids[1],
      'source', 'customer_project_feedback'
    ),
    null
  );

  return true;
end;
$$;

revoke all on function accessrevamp_private.complete_accessrevamp_homepage_selection_from_feedback(uuid)
  from public, anon, authenticated;

-- Defer reconciliation until the workflow advancement that changed the task
-- to waiting_customer has finished, avoiding a recursive overwrite.
drop trigger if exists reconcile_accessrevamp_homepage_selection_task_trigger
  on public.project_workflow_tasks;
create constraint trigger reconcile_accessrevamp_homepage_selection_task_trigger
after update
on public.project_workflow_tasks
deferrable initially deferred
for each row
execute function public.reconcile_accessrevamp_homepage_selection_task();

-- Block only terminal selections. A task that is blocked before activation may
-- safely receive durable feedback for later reconciliation.
create or replace function public.guard_accessrevamp_feedback_against_finalized_selection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.action = 'select_designs'
     and exists (
       select 1
         from public.project_workflow_tasks selection_task
         join public.project_workflows workflow
           on workflow.id = selection_task.workflow_id
         join public.orders paid_order
           on paid_order.id = workflow.order_id
          and paid_order.status = 'paid'
        where workflow.project_id = new.project_id
          and workflow.plan_key = 'homepage_reveal'
          and selection_task.task_key = 'customer_homepage_selection'
          and selection_task.revision_round = new.revision_round
          and selection_task.status in ('succeeded', 'skipped', 'canceled')
     ) then
    raise exception 'Homepage selection is already finalized.'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_accessrevamp_feedback_against_finalized_selection()
  from public, anon, authenticated;

-- Repair eligible waiting tasks using only the newest non-rejected ranking.
do $$
declare
  feedback_id uuid;
begin
  for feedback_id in
    select distinct on (workflow.project_id)
      feedback.id
      from public.project_workflows workflow
      join public.orders paid_order
        on paid_order.id = workflow.order_id
       and paid_order.status = 'paid'
      join public.project_workflow_tasks selection_task
        on selection_task.workflow_id = workflow.id
       and selection_task.task_key = 'customer_homepage_selection'
       and selection_task.status = 'waiting_customer'
       and selection_task.revision_round = 0
      join public.customer_project_feedback feedback
        on feedback.project_id = workflow.project_id
       and feedback.action = 'select_designs'
       and feedback.status <> 'rejected'
       and pg_catalog.cardinality(feedback.selected_option_ids) between 1 and 3
       and feedback.revision_round = 0
     where workflow.plan_key = 'homepage_reveal'
     order by workflow.project_id, feedback.created_at desc, feedback.id desc
  loop
    perform accessrevamp_private.complete_accessrevamp_homepage_selection_from_feedback(feedback_id);
  end loop;
end;
$$;

comment on function public.enforce_accessrevamp_webhook_liveness() is
  'Reconciles stale unpaid checkouts and records missing webhook freshness without treating an abandoned session as a global transport outage.';
comment on function accessrevamp_private.complete_accessrevamp_homepage_selection_from_feedback(uuid) is
  'Idempotently advances one paid Homepage Reveal selection task from eligible, non-rejected durable customer feedback.';
comment on function public.guard_accessrevamp_feedback_against_finalized_selection() is
  'Rejects new Homepage Reveal rankings only after the paid customer selection task reaches a terminal state.';

commit;
