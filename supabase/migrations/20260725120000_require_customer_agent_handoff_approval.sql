alter table public.project_workflows
  add column if not exists customer_agent_handoff_approved_at timestamptz,
  add column if not exists customer_agent_handoff_approved_by text;

create or replace function public.approve_accessrevamp_customer_agent_handoff(
  p_workflow_id uuid,
  p_approved_by text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if length(trim(coalesce(p_approved_by, ''))) < 2 then
    raise exception 'A human approver identity is required' using errcode = '22023';
  end if;

  update public.project_workflows w
     set customer_agent_handoff_approved_at = timezone('utc', now()),
         customer_agent_handoff_approved_by = left(trim(p_approved_by), 200),
         updated_at = timezone('utc', now())
   where w.id = p_workflow_id
     and exists (
       select 1
       from public.orders o
       where o.id = w.order_id
         and o.status = 'paid'
     );

  return found;
end;
$$;

create or replace function public.claim_accessrevamp_workflow_tasks(
  p_agent text,
  p_limit integer default 1
)
returns setof public.project_workflow_tasks
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_limit < 1 or p_limit > 20 then raise exception 'Invalid task claim limit'; end if;
  if p_agent not in ('main_agent','customer_agent','website_agent','design_agent','security_agent','integration_worker') then
    raise exception 'Unknown agent';
  end if;
  if not exists (
    select 1
    from public.accessrevamp_agent_settings
    where singleton = true and orchestration_enabled
  ) then
    return;
  end if;

  return query
  with candidates as (
    select t.id
    from public.project_workflow_tasks t
    join public.project_workflows w on w.id = t.workflow_id
    where t.assigned_agent = p_agent
      and t.status = 'queued'
      and w.status in ('queued','running')
      and (
        p_agent <> 'customer_agent'
        or w.customer_agent_handoff_approved_at is not null
      )
    order by t.sequence_number, t.created_at
    for update of t skip locked
    limit p_limit
  )
  update public.project_workflow_tasks t
     set status = 'running',
         attempt_count = t.attempt_count + 1,
         started_at = coalesce(t.started_at, timezone('utc', now())),
         updated_at = timezone('utc', now())
  from candidates c
  where t.id = c.id
  returning t.*;
end;
$$;

revoke all on function public.approve_accessrevamp_customer_agent_handoff(uuid,text)
  from public, anon, authenticated;
revoke all on function public.claim_accessrevamp_workflow_tasks(text,integer)
  from public, anon, authenticated;
grant execute on function public.approve_accessrevamp_customer_agent_handoff(uuid,text)
  to service_role;
grant execute on function public.claim_accessrevamp_workflow_tasks(text,integer)
  to service_role;
