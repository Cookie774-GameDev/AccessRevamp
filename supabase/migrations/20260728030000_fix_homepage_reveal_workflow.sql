-- Homepage Reveal ends with a reviewed customer-specific documentation handoff.
-- It intentionally contains no website implementation or poster production.

update public.accessrevamp_workflow_templates
set task_manifest = '[
  {"sequence":1,"task_key":"payment_reconcile","stage":"payment_reconciliation","agent":"main_agent","status":"queued","required":true},
  {"sequence":2,"task_key":"create_customer_folder","stage":"customer_setup","agent":"integration_worker","status":"waiting_integration","required":true},
  {"sequence":3,"task_key":"research_customer_website","stage":"research","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":4,"task_key":"passive_quality_audit","stage":"audit","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":5,"task_key":"passive_security_review","stage":"audit","agent":"security_agent","status":"blocked","required":true},
  {"sequence":6,"task_key":"growth_and_monetization_guidance","stage":"strategy","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":7,"task_key":"generate_five_homepage_options","stage":"design","agent":"design_agent","status":"blocked","required":true,"normal_options":3,"cinematic_options":2},
  {"sequence":8,"task_key":"human_quality_review","stage":"quality_review","agent":"main_agent","status":"blocked","required":true,"review_scope":"five_homepage_options"},
  {"sequence":9,"task_key":"customer_homepage_selection","stage":"customer_approval","agent":"main_agent","status":"waiting_customer","required":true,"selection_count_min":1,"selection_count_max":3,"rank_order_preserved":true,"primary_option_index":1,"allowed_option_groups":["homepage_normal","homepage_cinematic"],"revision_round":0},
  {"sequence":10,"task_key":"write_customer_skill_md","stage":"specification","agent":"customer_agent","status":"blocked","required":true,"required_outputs":["SKILL.md"],"required_evidence":["artifact_path","sha256"],"primary_design_source":"customer_homepage_selection.output_payload.primary_design_option_id"},
  {"sequence":11,"task_key":"owner_review_customer_skill_md","stage":"quality_review","agent":"main_agent","status":"blocked","required":true,"review_output":"SKILL.md","required_evidence":["artifact_path","sha256","reviewed_by","reviewed_at"]},
  {"sequence":12,"task_key":"write_customer_design_md","stage":"specification","agent":"customer_agent","status":"blocked","required":true,"required_outputs":["DESIGN.md"],"required_evidence":["artifact_path","sha256"],"primary_design_source":"customer_homepage_selection.output_payload.primary_design_option_id"},
  {"sequence":13,"task_key":"owner_review_customer_design_md","stage":"quality_review","agent":"main_agent","status":"blocked","required":true,"review_output":"DESIGN.md","required_evidence":["artifact_path","sha256","reviewed_by","reviewed_at"]},
  {"sequence":14,"task_key":"assemble_initial_delivery","stage":"delivery","agent":"main_agent","status":"blocked","required":true,"customer_outputs":["sourced_audit","five_homepage_concepts"],"internal_handoff_evidence":["customer_selection","SKILL.md","DESIGN.md"]},
  {"sequence":15,"task_key":"notify_customer","stage":"delivery","agent":"integration_worker","status":"blocked","required":true},
  {"sequence":16,"task_key":"homepage_reveal_handoff_stop","stage":"handoff","agent":"main_agent","status":"blocked","required":true,"required_evidence":["delivery_manifest_path","delivery_manifest_sha256","customer_notified_at"],"stop_before_implementation":true}
]'::jsonb,
    updated_at = timezone('utc', now())
where plan_key = 'homepage_reveal';

create or replace function public.guard_accessrevamp_homepage_selection_completion()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  workflow_row public.project_workflows%rowtype;
  selected_options jsonb;
  v_selection_count integer;
  v_distinct_selection_count integer;
  v_matching_option_count integer;
begin
  if new.task_key = 'customer_homepage_selection'
     and new.status = 'succeeded'
     and old.status is distinct from 'succeeded' then
    select workflow.*
      into workflow_row
      from public.project_workflows workflow
     where workflow.id = new.workflow_id;

    if not exists (
      select 1
        from public.project_workflow_tasks review_task
       where review_task.workflow_id = new.workflow_id
         and review_task.task_key = 'human_quality_review'
         and review_task.status = 'succeeded'
    ) then
      raise exception 'Homepage options require owner review before customer selection';
    end if;

    selected_options := new.output_payload -> 'selected_option_ids';
    if jsonb_typeof(selected_options) <> 'array' then
      raise exception 'Homepage selection requires a ranked option array';
    end if;

    v_selection_count := jsonb_array_length(selected_options);
    if v_selection_count not between 1 and 3 then
      raise exception 'Homepage selection requires one to three ranked options';
    end if;

    select count(distinct selected_option.value)
      into v_distinct_selection_count
      from jsonb_array_elements_text(selected_options) selected_option(value);
    if v_distinct_selection_count <> v_selection_count then
      raise exception 'Homepage selection rankings must be unique';
    end if;

    if nullif(new.output_payload ->> 'primary_design_option_id', '') is null then
      new.output_payload := jsonb_set(
        new.output_payload,
        '{primary_design_option_id}',
        to_jsonb(selected_options ->> 0),
        true
      );
    end if;
    if new.output_payload ->> 'primary_design_option_id'
       is distinct from selected_options ->> 0 then
      raise exception 'Homepage primary design must be the first ranked option';
    end if;

    select count(*)
      into v_matching_option_count
      from jsonb_array_elements_text(selected_options) selected_option(value)
      join public.project_design_options option_row
        on option_row.id::text = selected_option.value
     where option_row.project_id = workflow_row.project_id
       and option_row.option_group in ('homepage_normal','homepage_cinematic')
       and option_row.revision_round = 0
       and option_row.status in ('customer_ready','selected')
       and option_row.human_approved_at is not null
       and nullif(option_row.human_approved_by, '') is not null;

    if v_matching_option_count <> v_selection_count then
      raise exception 'Every ranked homepage option must be customer-visible, owner-reviewed, and scoped to this project and revision';
    end if;

    if not exists (
      select 1
        from public.project_design_options primary_option
       where primary_option.id::text = new.output_payload ->> 'primary_design_option_id'
         and primary_option.project_id = workflow_row.project_id
         and primary_option.revision_round = 0
         and primary_option.status = 'selected'
         and primary_option.customer_selected_at is not null
         and primary_option.human_approved_at is not null
    ) then
      raise exception 'The first ranked homepage option must be recorded as the primary selected design';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_accessrevamp_homepage_selection_completion_trigger
  on public.project_workflow_tasks;
create trigger guard_accessrevamp_homepage_selection_completion_trigger
before update of status, output_payload
on public.project_workflow_tasks
for each row
execute function public.guard_accessrevamp_homepage_selection_completion();

revoke all on function public.guard_accessrevamp_homepage_selection_completion()
  from public, anon, authenticated;

create or replace function public.activate_accessrevamp_homepage_selection_from_feedback()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  selection_task_id uuid;
begin
  if not (
    new.action = 'select_designs'
    and cardinality(new.selected_option_ids) between 1 and 3
    and new.revision_round = 0
  ) then
    return new;
  end if;

  select selection_task.id
    into selection_task_id
    from public.project_workflow_tasks selection_task
    join public.project_workflows workflow
      on workflow.id = selection_task.workflow_id
    join public.orders paid_order
      on paid_order.id = workflow.order_id
     and paid_order.status = 'paid'
   where workflow.project_id = new.project_id
     and workflow.plan_key = 'homepage_reveal'
     and selection_task.task_key = 'customer_homepage_selection'
     and selection_task.status = 'waiting_customer'
     and selection_task.revision_round = 0
   for update of selection_task;

  if selection_task_id is not null then
    perform public.complete_accessrevamp_workflow_task(
      selection_task_id,
      true,
      jsonb_build_object(
        'feedback_id', new.id,
        'selected_option_ids', to_jsonb(new.selected_option_ids),
        'primary_design_option_id', new.selected_option_ids[1],
        'source', 'customer_project_feedback'
      ),
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists activate_accessrevamp_homepage_selection_from_feedback_trigger
  on public.customer_project_feedback;
create trigger activate_accessrevamp_homepage_selection_from_feedback_trigger
after insert
on public.customer_project_feedback
for each row
execute function public.activate_accessrevamp_homepage_selection_from_feedback();

revoke all on function public.activate_accessrevamp_homepage_selection_from_feedback()
  from public, anon, authenticated;

-- Reconcile only already-created, paid Homepage Reveal workflows. Orderless
-- evaluation projects remain workflows-free because this migration never
-- creates project_workflows or invokes the bootstrap function.
update public.project_workflow_tasks existing_task
   set sequence_number = case existing_task.task_key
         when 'human_quality_review' then 8
         when 'assemble_initial_delivery' then 14
         when 'notify_customer' then 15
       end,
       status = case
         when existing_task.task_key in ('assemble_initial_delivery','notify_customer')
          and existing_task.status not in ('succeeded','skipped','canceled')
           then 'blocked'
         else existing_task.status
       end,
       input_payload = case
         when existing_task.task_key = 'assemble_initial_delivery'
           then '{"customer_outputs":["sourced_audit","five_homepage_concepts"],"internal_handoff_evidence":["customer_selection","SKILL.md","DESIGN.md"]}'::jsonb
         else existing_task.input_payload
       end,
       updated_at = timezone('utc', now())
  from public.project_workflows workflow
  join public.orders paid_order
    on paid_order.id = workflow.order_id
   and paid_order.status = 'paid'
 where existing_task.workflow_id = workflow.id
   and workflow.plan_key = 'homepage_reveal'
   and existing_task.task_key in ('human_quality_review','assemble_initial_delivery','notify_customer');

insert into public.project_workflow_tasks (
  workflow_id, sequence_number, task_key, stage, assigned_agent, status,
  activation_mode, required, revision_round, idempotency_key, input_payload
)
select
  workflow.id, task.sequence_number, task.task_key, task.stage,
  task.assigned_agent, 'blocked', task.activation_mode, true, 0,
  workflow.id::text || ':' || task.task_key || ':0', task.input_payload
from public.project_workflows workflow
join public.orders paid_order
  on paid_order.id = workflow.order_id
 and paid_order.status = 'paid'
cross join (
  values
    (9, 'customer_homepage_selection', 'customer_approval', 'main_agent', 'customer',
      '{"selection_count_min":1,"selection_count_max":3,"rank_order_preserved":true,"primary_option_index":1,"allowed_option_groups":["homepage_normal","homepage_cinematic"],"revision_round":0}'::jsonb),
    (10, 'write_customer_skill_md', 'specification', 'customer_agent', 'automatic',
      '{"required_outputs":["SKILL.md"],"required_evidence":["artifact_path","sha256"],"primary_design_source":"customer_homepage_selection.output_payload.primary_design_option_id"}'::jsonb),
    (11, 'owner_review_customer_skill_md', 'quality_review', 'main_agent', 'automatic',
      '{"review_output":"SKILL.md","required_evidence":["artifact_path","sha256","reviewed_by","reviewed_at"]}'::jsonb),
    (12, 'write_customer_design_md', 'specification', 'customer_agent', 'automatic',
      '{"required_outputs":["DESIGN.md"],"required_evidence":["artifact_path","sha256"],"primary_design_source":"customer_homepage_selection.output_payload.primary_design_option_id"}'::jsonb),
    (13, 'owner_review_customer_design_md', 'quality_review', 'main_agent', 'automatic',
      '{"review_output":"DESIGN.md","required_evidence":["artifact_path","sha256","reviewed_by","reviewed_at"]}'::jsonb),
    (16, 'homepage_reveal_handoff_stop', 'handoff', 'main_agent', 'automatic',
      '{"required_evidence":["delivery_manifest_path","delivery_manifest_sha256","customer_notified_at"],"stop_before_implementation":true}'::jsonb)
) as task(sequence_number, task_key, stage, assigned_agent, activation_mode, input_payload)
where workflow.plan_key = 'homepage_reveal'
on conflict (workflow_id, task_key, revision_round) do update
set sequence_number = excluded.sequence_number,
    stage = excluded.stage,
    assigned_agent = excluded.assigned_agent,
    activation_mode = excluded.activation_mode,
    required = excluded.required,
    input_payload = excluded.input_payload,
    updated_at = timezone('utc', now());

update public.project_workflows workflow
   set status = case when workflow.status = 'completed' then 'running' else workflow.status end,
       completed_at = case when workflow.status = 'completed' then null else workflow.completed_at end,
       updated_at = timezone('utc', now())
  from public.orders paid_order
 where paid_order.id = workflow.order_id
   and paid_order.status = 'paid'
   and workflow.plan_key = 'homepage_reveal'
   and exists (
     select 1
       from public.project_workflow_tasks required_task
      where required_task.workflow_id = workflow.id
        and required_task.required
        and required_task.status not in ('succeeded','skipped','canceled')
   );

do $$
declare
  workflow_id uuid;
begin
  for workflow_id in
    select workflow.id
      from public.project_workflows workflow
      join public.orders paid_order
        on paid_order.id = workflow.order_id
       and paid_order.status = 'paid'
     where workflow.plan_key = 'homepage_reveal'
       and workflow.status in ('queued','running','waiting_customer','waiting_integration')
  loop
    perform public.advance_accessrevamp_workflow(workflow_id);
  end loop;
end;
$$;

comment on function public.guard_accessrevamp_homepage_selection_completion() is
  'Prevents Homepage Reveal advancement until one to three unique, rank-ordered, customer-visible, owner-reviewed, project-scoped homepage options are safely selected.';
comment on function public.activate_accessrevamp_homepage_selection_from_feedback() is
  'Advances paid Homepage Reveal work from one to three safe revision-zero rankings and records rank one as the primary design.';
