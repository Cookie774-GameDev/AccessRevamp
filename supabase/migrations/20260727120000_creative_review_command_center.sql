begin;

alter table public.project_design_options
  add column if not exists parent_option_id uuid references public.project_design_options(id) on delete set null,
  add column if not exists submitted_by_agent text,
  add column if not exists submission_note text,
  add column if not exists design_review_status text not null default 'pending'
    check (design_review_status in ('pending','changes_requested','approved','rejected')),
  add column if not exists delivery_review_status text not null default 'pending'
    check (delivery_review_status in ('pending','approved','rejected')),
  add column if not exists design_approved_by uuid references auth.users(id) on delete set null,
  add column if not exists design_approved_at timestamptz,
  add column if not exists delivery_approved_by uuid references auth.users(id) on delete set null,
  add column if not exists delivery_approved_at timestamptz;

alter table public.project_design_options drop constraint if exists project_design_options_submitted_agent_check;
alter table public.project_design_options add constraint project_design_options_submitted_agent_check
  check (submitted_by_agent is null or submitted_by_agent in ('main_agent','customer_agent','website_agent','design_agent','security_agent','integration_worker'));

update public.project_design_options
set status='human_review', delivery_review_status='pending',
    delivery_approved_by=null, delivery_approved_at=null
where status in ('customer_ready','selected','delivered');

create table if not exists public.project_creative_feedback (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  design_option_id uuid not null references public.project_design_options(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  assigned_agent text not null,
  note text not null check (char_length(note) between 8 and 4000),
  status text not null default 'open' check (status in ('open','resolved','superseded')),
  idempotency_key text not null unique,
  routed_task_id uuid references public.project_workflow_tasks(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table if not exists public.project_creative_review_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  design_option_id uuid not null references public.project_design_options(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('submitted','changes_requested','design_approved','delivery_approved','rejected','superseded')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object'),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists creative_feedback_project_idx on public.project_creative_feedback(project_id,created_at desc);
create index if not exists creative_events_project_idx on public.project_creative_review_events(project_id,created_at desc);
alter table public.project_creative_feedback enable row level security;
alter table public.project_creative_review_events enable row level security;
revoke all on table public.project_creative_feedback from public, anon, authenticated;
revoke all on table public.project_creative_review_events from public, anon, authenticated;
grant all on table public.project_creative_feedback to service_role;
grant all on table public.project_creative_review_events to service_role;

create or replace function public.enforce_accessrevamp_delivery_review()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if new.status in ('customer_ready','selected','delivered') and new.delivery_review_status <> 'approved' then
  raise exception 'Separate delivery approval is required before customer visibility';
 end if;
 return new;
end$$;
drop trigger if exists enforce_accessrevamp_delivery_review_trigger on public.project_design_options;
create trigger enforce_accessrevamp_delivery_review_trigger before insert or update of status,delivery_review_status
on public.project_design_options for each row execute function public.enforce_accessrevamp_delivery_review();

create or replace function public.request_accessrevamp_creative_changes(p_option_id uuid,p_operator_id uuid,p_note text,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.project_design_options; w uuid; t uuid; f uuid;
begin
 if not exists(select 1 from public.accessrevamp_operators where user_id=p_operator_id and active) then raise exception 'operator access required'; end if;
 select * into o from public.project_design_options where id=p_option_id for update;
 if o.id is null then raise exception 'design option not found'; end if;
 select id into w from public.project_workflows where project_id=o.project_id;
 if w is not null then
  insert into public.project_workflow_tasks(workflow_id,sequence_number,task_key,stage,assigned_agent,status,activation_mode,revision_round,idempotency_key,input_payload)
  values(w,900,'creative_revision_'||o.id,'revision',coalesce(o.submitted_by_agent,'design_agent'),'queued','manual',least(o.revision_round+1,2),'creative-revision:'||p_idempotency_key,jsonb_build_object('design_option_id',o.id,'note',p_note))
  on conflict(idempotency_key) do update set updated_at=timezone('utc',now()) returning id into t;
 end if;
 insert into public.project_creative_feedback(project_id,design_option_id,author_id,assigned_agent,note,idempotency_key,routed_task_id)
 values(o.project_id,o.id,p_operator_id,coalesce(o.submitted_by_agent,'design_agent'),p_note,p_idempotency_key,t)
 on conflict(idempotency_key) do update set note=excluded.note returning id into f;
 update public.project_design_options set status='human_review',design_review_status='changes_requested',delivery_review_status='pending',delivery_approved_by=null,delivery_approved_at=null where id=o.id;
 insert into public.project_creative_review_events(project_id,design_option_id,actor_id,event_type,details) values(o.project_id,o.id,p_operator_id,'changes_requested',jsonb_build_object('feedback_id',f,'task_id',t));
 return f;
end$$;

create or replace function public.approve_accessrevamp_creative_design(p_option_id uuid,p_operator_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.project_design_options;
begin
 if not exists(select 1 from public.accessrevamp_operators where user_id=p_operator_id and active) then raise exception 'operator access required'; end if;
 update public.project_design_options set design_review_status='approved',design_approved_by=p_operator_id,design_approved_at=timezone('utc',now()) where id=p_option_id returning * into o;
 if o.id is null then raise exception 'design option not found'; end if;
 insert into public.project_creative_review_events(project_id,design_option_id,actor_id,event_type) values(o.project_id,o.id,p_operator_id,'design_approved');
 return true;
end$$;

create or replace function public.approve_accessrevamp_creative_delivery(p_option_id uuid,p_operator_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.project_design_options;
begin
 if not exists(select 1 from public.accessrevamp_operators where user_id=p_operator_id and active) then raise exception 'operator access required'; end if;
 select * into o from public.project_design_options where id=p_option_id for update;
 if o.design_review_status <> 'approved' then raise exception 'design approval required'; end if;
 if o.rights_review_status <> 'approved' or o.copy_review_status <> 'approved' or o.product_fidelity_status <> 'approved' or o.source_manifest_verified_at is null then raise exception 'delivery review prerequisites incomplete'; end if;
 update public.project_design_options set delivery_review_status='approved',delivery_approved_by=p_operator_id,delivery_approved_at=timezone('utc',now()),status='customer_ready' where id=p_option_id;
 insert into public.project_creative_review_events(project_id,design_option_id,actor_id,event_type) values(o.project_id,o.id,p_operator_id,'delivery_approved');
 return true;
end$$;

revoke all on function public.request_accessrevamp_creative_changes(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.approve_accessrevamp_creative_design(uuid,uuid) from public,anon,authenticated;
revoke all on function public.approve_accessrevamp_creative_delivery(uuid,uuid) from public,anon,authenticated;
revoke all on function public.enforce_accessrevamp_delivery_review() from public,anon,authenticated;
grant execute on function public.request_accessrevamp_creative_changes(uuid,uuid,text,text) to service_role;
grant execute on function public.approve_accessrevamp_creative_design(uuid,uuid) to service_role;
grant execute on function public.approve_accessrevamp_creative_delivery(uuid,uuid) to service_role;
grant execute on function public.enforce_accessrevamp_delivery_review() to service_role;

alter table public.outreach_settings add column if not exists postal_address_candidate text;
update public.outreach_settings set postal_address_candidate='Creek Hollow Ave Zachary',sending_enabled=false where singleton=true;

commit;
