begin;

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

create or replace function public.activate_accessrevamp_homepage_selection_from_feedback()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform accessrevamp_private.complete_accessrevamp_homepage_selection_from_feedback(new.id);
  return new;
end;
$$;

create or replace function public.reconcile_accessrevamp_homepage_selection_task()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  feedback_id uuid;
begin
  if new.task_key = 'customer_homepage_selection'
     and new.status = 'waiting_customer'
     and old.status is distinct from 'waiting_customer' then
    select feedback.id
      into feedback_id
      from public.customer_project_feedback feedback
      join public.project_workflows workflow
        on workflow.id = new.workflow_id
       and workflow.project_id = feedback.project_id
      join public.orders paid_order
        on paid_order.id = workflow.order_id
       and paid_order.status = 'paid'
     where workflow.plan_key = 'homepage_reveal'
       and feedback.action = 'select_designs'
       and cardinality(feedback.selected_option_ids) between 1 and 3
       and feedback.revision_round = 0
     order by feedback.created_at desc, feedback.id desc
     limit 1;

    if feedback_id is not null then
      perform accessrevamp_private.complete_accessrevamp_homepage_selection_from_feedback(feedback_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reconcile_accessrevamp_homepage_selection_task_trigger
  on public.project_workflow_tasks;
create trigger reconcile_accessrevamp_homepage_selection_task_trigger
after update of status
on public.project_workflow_tasks
for each row
execute function public.reconcile_accessrevamp_homepage_selection_task();

revoke all on function public.reconcile_accessrevamp_homepage_selection_task()
  from public, anon, authenticated;

create or replace function public.guard_accessrevamp_feedback_against_finalized_selection()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
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
          and selection_task.status <> 'waiting_customer'
     ) then
    raise exception 'Homepage selection is already finalized.'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_accessrevamp_feedback_against_finalized_selection_trigger
  on public.customer_project_feedback;
create trigger guard_accessrevamp_feedback_against_finalized_selection_trigger
before insert
on public.customer_project_feedback
for each row
execute function public.guard_accessrevamp_feedback_against_finalized_selection();

revoke all on function public.guard_accessrevamp_feedback_against_finalized_selection()
  from public, anon, authenticated;

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
       and cardinality(feedback.selected_option_ids) between 1 and 3
       and feedback.revision_round = 0
     where workflow.plan_key = 'homepage_reveal'
     order by workflow.project_id, feedback.created_at desc, feedback.id desc
  loop
    perform accessrevamp_private.complete_accessrevamp_homepage_selection_from_feedback(feedback_id);
  end loop;
end;
$$;

comment on function accessrevamp_private.complete_accessrevamp_homepage_selection_from_feedback(uuid) is
  'Idempotently advances one paid Homepage Reveal selection task from durable, already-recorded customer feedback.';
comment on function public.reconcile_accessrevamp_homepage_selection_task() is
  'Reconciles the newest eligible durable ranking whenever a paid Homepage Reveal selection task becomes customer-ready.';
comment on function public.guard_accessrevamp_feedback_against_finalized_selection() is
  'Rejects later Homepage Reveal rankings once the paid customer selection task is no longer accepting feedback.';

commit;
