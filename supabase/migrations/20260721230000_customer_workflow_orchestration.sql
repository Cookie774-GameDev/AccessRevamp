-- Durable AccessRevamp customer-delivery control plane.
-- Safe defaults deliberately keep email transport, active security testing,
-- external creative generation, and mailbox warm-up automation disabled.

create table if not exists public.accessrevamp_agent_settings (
  singleton boolean primary key default true check (singleton),
  orchestration_enabled boolean not null default true,
  external_email_transport_enabled boolean not null default false,
  mailbox_warmup_automation_enabled boolean not null default false,
  active_security_testing_enabled boolean not null default false,
  external_creative_generation_enabled boolean not null default false,
  maximum_artifact_bytes integer not null default 9000000 check (maximum_artifact_bytes between 1 and 9000000),
  drive_root_folder_id text,
  drive_customers_folder_id text,
  drive_payment_folder_id text,
  drive_payment_ledger_id text,
  updated_at timestamptz not null default timezone('utc', now())
);
insert into public.accessrevamp_agent_settings (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.order_drafts
  add column if not exists cinematic_scene_count smallint,
  add column if not exists portfolio_consent boolean not null default false,
  add column if not exists portfolio_consent_at timestamptz;
alter table public.order_drafts drop constraint if exists order_drafts_cinematic_scene_count_check;
alter table public.order_drafts add constraint order_drafts_cinematic_scene_count_check
  check (cinematic_scene_count is null or cinematic_scene_count in (3,4));

alter table public.customer_projects
  add column if not exists cinematic_scene_count smallint,
  add column if not exists portfolio_consent boolean not null default false,
  add column if not exists portfolio_consent_at timestamptz,
  add column if not exists revision_limit smallint not null default 2;
alter table public.customer_projects drop constraint if exists customer_projects_cinematic_scene_count_check;
alter table public.customer_projects add constraint customer_projects_cinematic_scene_count_check
  check (cinematic_scene_count is null or cinematic_scene_count in (3,4));
alter table public.customer_projects drop constraint if exists customer_projects_revision_limit_check;
alter table public.customer_projects add constraint customer_projects_revision_limit_check
  check (revision_limit between 0 and 2);

create table if not exists public.accessrevamp_workflow_templates (
  plan_key text primary key check (plan_key in ('homepage_reveal','complete_revamp','cinematic_scroll')),
  revision_limit smallint not null default 2 check (revision_limit between 0 and 2),
  task_manifest jsonb not null check (jsonb_typeof(task_manifest) = 'array'),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_workflows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.customer_projects(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  plan_key text not null check (plan_key in ('homepage_reveal','complete_revamp','cinematic_scroll')),
  status text not null default 'queued' check (status in ('queued','running','waiting_customer','waiting_integration','blocked','completed','canceled')),
  current_stage text not null default 'payment_reconciliation',
  cinematic_scene_count smallint check (cinematic_scene_count is null or cinematic_scene_count in (3,4)),
  revision_round smallint not null default 0 check (revision_round between 0 and 2),
  customer_folder_provider text check (customer_folder_provider is null or customer_folder_provider in ('google_drive','local')),
  customer_folder_external_id text,
  customer_folder_url text,
  started_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists project_workflows_status_updated_idx on public.project_workflows (status, updated_at);
create index if not exists project_workflows_order_idx on public.project_workflows (order_id);

create table if not exists public.project_workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.project_workflows(id) on delete cascade,
  sequence_number integer not null check (sequence_number between 1 and 1000),
  task_key text not null,
  stage text not null,
  assigned_agent text not null check (assigned_agent in ('main_agent','customer_agent','website_agent','design_agent','security_agent','integration_worker')),
  status text not null default 'queued' check (status in ('queued','blocked','running','waiting_customer','waiting_integration','succeeded','failed','canceled','skipped')),
  activation_mode text not null default 'automatic' check (activation_mode in ('automatic','customer','integration','manual')),
  required boolean not null default true,
  revision_round smallint not null default 0 check (revision_round between 0 and 2),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 20),
  maximum_attempts smallint not null default 3 check (maximum_attempts between 1 and 20),
  idempotency_key text not null unique,
  input_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(input_payload) = 'object'),
  output_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(output_payload) = 'object'),
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workflow_id, task_key, revision_round)
);
create index if not exists project_workflow_tasks_claim_idx on public.project_workflow_tasks (assigned_agent, status, sequence_number, created_at);
create index if not exists project_workflow_tasks_workflow_idx on public.project_workflow_tasks (workflow_id, sequence_number);

create table if not exists public.project_research_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  source_type text not null check (source_type in ('website_page','customer_email','customer_upload','stripe','supabase','public_reference','operator_note')),
  source_url text,
  title text,
  retrieved_at timestamptz not null default timezone('utc', now()),
  content_sha256 text check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'),
  extracted_facts jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_facts) = 'object'),
  rights_basis text,
  status text not null default 'pending_review' check (status in ('pending_review','verified','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);
create index if not exists project_research_sources_project_idx on public.project_research_sources (project_id, created_at);

create table if not exists public.project_security_authorizations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  scope jsonb not null default '{}'::jsonb check (jsonb_typeof(scope) = 'object'),
  authorization_source text not null,
  authorized_by_customer text not null,
  valid_from timestamptz not null default timezone('utc', now()),
  valid_until timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','revoked','used')),
  created_at timestamptz not null default timezone('utc', now()),
  check (valid_until > valid_from)
);
create index if not exists project_security_authorizations_project_idx on public.project_security_authorizations (project_id, status, valid_until);

create table if not exists public.project_findings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  research_source_id uuid references public.project_research_sources(id) on delete set null,
  security_authorization_id uuid references public.project_security_authorizations(id) on delete set null,
  audit_type text not null check (audit_type in ('accessibility','usability','performance','content','conversion','seo','passive_security','authorized_active_security')),
  severity text not null check (severity in ('blocking','serious','moderate','improvement','informational')),
  confidence text not null check (confidence in ('verified','high','medium','low','needs_manual_review')),
  title text not null,
  summary text not null,
  evidence text not null,
  remediation text not null,
  customer_visible boolean not null default false,
  status text not null default 'candidate' check (status in ('candidate','verified','rejected','resolved')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (audit_type <> 'authorized_active_security' or security_authorization_id is not null)
);
create index if not exists project_findings_project_status_idx on public.project_findings (project_id, status, customer_visible);
create index if not exists project_findings_research_source_idx on public.project_findings (research_source_id);
create index if not exists project_findings_security_authorization_idx on public.project_findings (security_authorization_id);

create table if not exists public.project_design_options (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  option_group text not null check (option_group in ('homepage_normal','homepage_cinematic','cinematic_sequence','cinematic_scene','page_reference','poster_still','poster_animated','business_card','brochure')),
  option_number smallint not null check (option_number between 1 and 50),
  sequence_key text,
  scene_number smallint check (scene_number is null or scene_number between 1 and 4),
  revision_round smallint not null default 0 check (revision_round between 0 and 2),
  status text not null default 'draft' check (status in ('draft','human_review','customer_ready','selected','rejected','superseded','delivered')),
  storage_path text,
  external_url text,
  prompt_summary text,
  customer_selected_at timestamptz,
  human_approved_by text,
  human_approved_at timestamptz,
  rights_review_status text not null default 'needs_review' check (rights_review_status in ('needs_review','approved','rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, option_group, option_number, revision_round, scene_number, sequence_key)
);
create index if not exists project_design_options_customer_idx on public.project_design_options (project_id, status, option_group, revision_round);

create table if not exists public.project_portfolio_consents (
  project_id uuid primary key references public.customer_projects(id) on delete cascade,
  consent_granted boolean not null default false,
  consent_scope text not null default 'none' check (consent_scope in ('none','anonymous_screenshots','named_case_study','full_portfolio_use')),
  terms_version text,
  consented_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (not consent_granted or (consent_scope <> 'none' and consented_at is not null))
);

create table if not exists public.project_approval_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  task_id uuid references public.project_workflow_tasks(id) on delete set null,
  purpose text not null check (purpose in ('homepage_selection','revision_selection','cinematic_sequence_selection','scene_selection','final_approval','portfolio_consent')),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'active' check (status in ('active','used','expired','revoked')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (expires_at > created_at)
);
create index if not exists project_approval_links_lookup_idx on public.project_approval_links (project_id, purpose, status, expires_at);
create index if not exists project_approval_links_task_idx on public.project_approval_links (task_id);

create table if not exists public.project_approval_selections (
  id uuid primary key default gen_random_uuid(),
  approval_link_id uuid not null unique references public.project_approval_links(id) on delete cascade,
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  selected_option_ids uuid[] not null default '{}',
  customer_notes text,
  submitted_at timestamptz not null default timezone('utc', now())
);
create index if not exists project_approval_selections_project_idx on public.project_approval_selections (project_id);

create table if not exists public.project_artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  task_id uuid references public.project_workflow_tasks(id) on delete set null,
  artifact_type text not null check (artifact_type in ('research_document','audit_report','security_report','design_image','poster','video','website_build','test_report','delivery_manifest','customer_message','skill_md','design_md')),
  storage_provider text not null check (storage_provider in ('supabase','google_drive','github','canva','higgsfield','netlify','external')),
  storage_path text,
  external_id text,
  external_url text,
  filename text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 9000000),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'draft' check (status in ('draft','verified','approved','delivered','superseded','failed')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists project_artifacts_project_idx on public.project_artifacts (project_id, artifact_type, status);
create index if not exists project_artifacts_task_idx on public.project_artifacts (task_id);

create table if not exists public.project_deliveries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  version smallint not null default 1 check (version between 1 and 100),
  delivery_type text not null check (delivery_type in ('initial_findings','design_options','revision_options','website_preview','final_package')),
  status text not null default 'draft' check (status in ('draft','human_review','approved','sent','acknowledged','superseded')),
  manifest jsonb not null default '{}'::jsonb check (jsonb_typeof(manifest) = 'object'),
  drive_url text,
  customer_notified_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, delivery_type, version)
);

create table if not exists public.project_provider_budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  provider text not null check (provider in ('higgsfield','canva','image_generation','other')),
  budget_key text not null,
  limit_units integer not null check (limit_units >= 0),
  used_units integer not null default 0 check (used_units >= 0),
  unit_name text not null default 'credits',
  status text not null default 'active' check (status in ('active','paused','exhausted','closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, provider, budget_key),
  check (used_units <= limit_units)
);

create table if not exists public.accessrevamp_integration_outbox (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.customer_projects(id) on delete cascade,
  workflow_id uuid references public.project_workflows(id) on delete cascade,
  task_id uuid references public.project_workflow_tasks(id) on delete set null,
  provider text not null check (provider in ('google_drive','google_sheets','gmail','icemail','stripe','supabase','canva','higgsfield','netlify','github')),
  operation text not null,
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending' check (status in ('pending','claimed','retry','succeeded','failed','canceled')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 20),
  maximum_attempts smallint not null default 5 check (maximum_attempts between 1 and 20),
  next_attempt_at timestamptz not null default timezone('utc', now()),
  claimed_by text,
  claimed_at timestamptz,
  external_id text,
  result_url text,
  result_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(result_payload) = 'object'),
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists accessrevamp_integration_outbox_claim_idx on public.accessrevamp_integration_outbox (provider, status, next_attempt_at, created_at);
create index if not exists accessrevamp_integration_outbox_project_idx on public.accessrevamp_integration_outbox (project_id);
create index if not exists accessrevamp_integration_outbox_workflow_idx on public.accessrevamp_integration_outbox (workflow_id);
create index if not exists accessrevamp_integration_outbox_task_idx on public.accessrevamp_integration_outbox (task_id);

insert into public.accessrevamp_workflow_templates (plan_key, revision_limit, task_manifest)
values
('homepage_reveal', 2, '[
  {"sequence":1,"task_key":"payment_reconcile","stage":"payment_reconciliation","agent":"main_agent","status":"queued","required":true},
  {"sequence":2,"task_key":"create_customer_folder","stage":"customer_setup","agent":"integration_worker","status":"waiting_integration","required":true},
  {"sequence":3,"task_key":"research_customer_website","stage":"research","agent":"customer_agent","status":"queued","required":true},
  {"sequence":4,"task_key":"passive_quality_audit","stage":"audit","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":5,"task_key":"passive_security_review","stage":"audit","agent":"security_agent","status":"blocked","required":true},
  {"sequence":6,"task_key":"growth_and_monetization_guidance","stage":"strategy","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":7,"task_key":"generate_five_homepage_options","stage":"design","agent":"design_agent","status":"blocked","required":true,"normal_options":3,"cinematic_options":2},
  {"sequence":8,"task_key":"human_quality_review","stage":"quality_review","agent":"main_agent","status":"blocked","required":true},
  {"sequence":9,"task_key":"assemble_initial_delivery","stage":"delivery","agent":"main_agent","status":"blocked","required":true},
  {"sequence":10,"task_key":"notify_customer","stage":"delivery","agent":"integration_worker","status":"blocked","required":true}
]'::jsonb),
('complete_revamp', 2, '[
  {"sequence":1,"task_key":"payment_reconcile","stage":"payment_reconciliation","agent":"main_agent","status":"queued","required":true},
  {"sequence":2,"task_key":"create_customer_folder","stage":"customer_setup","agent":"integration_worker","status":"waiting_integration","required":true},
  {"sequence":3,"task_key":"research_customer_website","stage":"research","agent":"customer_agent","status":"queued","required":true},
  {"sequence":4,"task_key":"passive_quality_audit","stage":"audit","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":5,"task_key":"passive_security_review","stage":"audit","agent":"security_agent","status":"blocked","required":true},
  {"sequence":6,"task_key":"growth_and_monetization_guidance","stage":"strategy","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":7,"task_key":"generate_five_homepage_options","stage":"design","agent":"design_agent","status":"blocked","required":true,"normal_options":3,"cinematic_options":2},
  {"sequence":8,"task_key":"customer_homepage_selection","stage":"customer_approval","agent":"main_agent","status":"waiting_customer","required":true},
  {"sequence":9,"task_key":"optional_revision_round_one","stage":"revision","agent":"design_agent","status":"blocked","required":false},
  {"sequence":10,"task_key":"optional_revision_round_two","stage":"revision","agent":"design_agent","status":"blocked","required":false},
  {"sequence":11,"task_key":"write_customer_skill_md","stage":"specification","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":12,"task_key":"write_customer_design_md","stage":"specification","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":13,"task_key":"generate_ten_page_reference_images","stage":"design","agent":"design_agent","status":"blocked","required":true},
  {"sequence":14,"task_key":"build_full_website","stage":"implementation","agent":"website_agent","status":"blocked","required":true},
  {"sequence":15,"task_key":"visual_match_qa","stage":"quality_review","agent":"website_agent","status":"blocked","required":true},
  {"sequence":16,"task_key":"functional_accessibility_qa","stage":"quality_review","agent":"security_agent","status":"blocked","required":true},
  {"sequence":17,"task_key":"create_five_animated_posters","stage":"creative_pack","agent":"design_agent","status":"blocked","required":true},
  {"sequence":18,"task_key":"create_ten_still_posters","stage":"creative_pack","agent":"design_agent","status":"blocked","required":true},
  {"sequence":19,"task_key":"assemble_final_delivery","stage":"delivery","agent":"main_agent","status":"blocked","required":true},
  {"sequence":20,"task_key":"notify_customer","stage":"delivery","agent":"integration_worker","status":"blocked","required":true}
]'::jsonb),
('cinematic_scroll', 2, '[
  {"sequence":1,"task_key":"payment_reconcile","stage":"payment_reconciliation","agent":"main_agent","status":"queued","required":true},
  {"sequence":2,"task_key":"create_customer_folder","stage":"customer_setup","agent":"integration_worker","status":"waiting_integration","required":true},
  {"sequence":3,"task_key":"confirm_three_or_four_scenes","stage":"customer_approval","agent":"main_agent","status":"waiting_customer","required":true},
  {"sequence":4,"task_key":"research_customer_website","stage":"research","agent":"customer_agent","status":"queued","required":true},
  {"sequence":5,"task_key":"passive_quality_audit","stage":"audit","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":6,"task_key":"passive_security_review","stage":"audit","agent":"security_agent","status":"blocked","required":true},
  {"sequence":7,"task_key":"growth_and_monetization_guidance","stage":"strategy","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":8,"task_key":"generate_five_homepage_options","stage":"design","agent":"design_agent","status":"blocked","required":true,"normal_options":3,"cinematic_options":2},
  {"sequence":9,"task_key":"customer_homepage_selection","stage":"customer_approval","agent":"main_agent","status":"waiting_customer","required":true},
  {"sequence":10,"task_key":"write_customer_skill_md","stage":"specification","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":11,"task_key":"write_customer_design_md","stage":"specification","agent":"customer_agent","status":"blocked","required":true},
  {"sequence":12,"task_key":"generate_two_cinematic_sequences","stage":"cinematic_design","agent":"design_agent","status":"blocked","required":true,"images_per_scene":2},
  {"sequence":13,"task_key":"customer_sequence_selection","stage":"customer_approval","agent":"main_agent","status":"waiting_customer","required":true},
  {"sequence":14,"task_key":"generate_higgsfield_scene_videos","stage":"cinematic_generation","agent":"integration_worker","status":"waiting_integration","required":true,"three_scene_credit_limit":150,"four_scene_credit_limit":200},
  {"sequence":15,"task_key":"integrate_smooth_scroll_sequence","stage":"implementation","agent":"website_agent","status":"blocked","required":true},
  {"sequence":16,"task_key":"generate_ten_page_reference_images","stage":"design","agent":"design_agent","status":"blocked","required":true},
  {"sequence":17,"task_key":"build_remaining_website","stage":"implementation","agent":"website_agent","status":"blocked","required":true},
  {"sequence":18,"task_key":"visual_match_qa","stage":"quality_review","agent":"website_agent","status":"blocked","required":true},
  {"sequence":19,"task_key":"functional_accessibility_qa","stage":"quality_review","agent":"security_agent","status":"blocked","required":true},
  {"sequence":20,"task_key":"create_five_animated_posters","stage":"creative_pack","agent":"design_agent","status":"blocked","required":true},
  {"sequence":21,"task_key":"create_ten_still_posters","stage":"creative_pack","agent":"design_agent","status":"blocked","required":true},
  {"sequence":22,"task_key":"assemble_final_delivery","stage":"delivery","agent":"main_agent","status":"blocked","required":true},
  {"sequence":23,"task_key":"notify_customer","stage":"delivery","agent":"integration_worker","status":"blocked","required":true}
]'::jsonb)
on conflict (plan_key) do update set
  revision_limit = excluded.revision_limit,
  task_manifest = excluded.task_manifest,
  updated_at = timezone('utc', now());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-project-artifacts',
  'customer-project-artifacts',
  false,
  9000000,
  array[
    'image/jpeg','image/png','image/webp','image/avif','image/svg+xml',
    'application/pdf','text/plain','text/markdown','application/json',
    'application/zip','video/mp4','video/webm'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.accessrevamp_agent_settings enable row level security;
alter table public.accessrevamp_workflow_templates enable row level security;
alter table public.project_workflows enable row level security;
alter table public.project_workflow_tasks enable row level security;
alter table public.project_research_sources enable row level security;
alter table public.project_security_authorizations enable row level security;
alter table public.project_findings enable row level security;
alter table public.project_design_options enable row level security;
alter table public.project_portfolio_consents enable row level security;
alter table public.project_approval_links enable row level security;
alter table public.project_approval_selections enable row level security;
alter table public.project_artifacts enable row level security;
alter table public.project_deliveries enable row level security;
alter table public.project_provider_budgets enable row level security;
alter table public.accessrevamp_integration_outbox enable row level security;

revoke all on table
  public.accessrevamp_agent_settings,
  public.accessrevamp_workflow_templates,
  public.project_workflows,
  public.project_workflow_tasks,
  public.project_research_sources,
  public.project_security_authorizations,
  public.project_findings,
  public.project_design_options,
  public.project_portfolio_consents,
  public.project_approval_links,
  public.project_approval_selections,
  public.project_artifacts,
  public.project_deliveries,
  public.project_provider_budgets,
  public.accessrevamp_integration_outbox
from public, anon, authenticated;

grant all on table
  public.accessrevamp_agent_settings,
  public.accessrevamp_workflow_templates,
  public.project_workflows,
  public.project_workflow_tasks,
  public.project_research_sources,
  public.project_security_authorizations,
  public.project_findings,
  public.project_design_options,
  public.project_portfolio_consents,
  public.project_approval_links,
  public.project_approval_selections,
  public.project_artifacts,
  public.project_deliveries,
  public.project_provider_budgets,
  public.accessrevamp_integration_outbox
to service_role;

grant select on public.project_workflows, public.project_findings, public.project_design_options, public.project_portfolio_consents, public.project_deliveries to authenticated;
grant insert, update on public.project_portfolio_consents to authenticated;

drop policy if exists project_workflows_select_own on public.project_workflows;
create policy project_workflows_select_own on public.project_workflows for select to authenticated
using (exists (select 1 from public.customer_projects p where p.id = project_workflows.project_id and p.user_id = (select auth.uid())));

drop policy if exists project_findings_select_visible_own on public.project_findings;
create policy project_findings_select_visible_own on public.project_findings for select to authenticated
using (customer_visible and status in ('verified','resolved') and exists (select 1 from public.customer_projects p where p.id = project_findings.project_id and p.user_id = (select auth.uid())));

drop policy if exists project_design_options_select_customer_ready_own on public.project_design_options;
create policy project_design_options_select_customer_ready_own on public.project_design_options for select to authenticated
using (status in ('customer_ready','selected','delivered') and exists (select 1 from public.customer_projects p where p.id = project_design_options.project_id and p.user_id = (select auth.uid())));

drop policy if exists project_deliveries_select_own on public.project_deliveries;
create policy project_deliveries_select_own on public.project_deliveries for select to authenticated
using (status in ('approved','sent','acknowledged') and exists (select 1 from public.customer_projects p where p.id = project_deliveries.project_id and p.user_id = (select auth.uid())));

drop policy if exists project_portfolio_consents_select_own on public.project_portfolio_consents;
create policy project_portfolio_consents_select_own on public.project_portfolio_consents for select to authenticated
using (exists (select 1 from public.customer_projects p where p.id = project_portfolio_consents.project_id and p.user_id = (select auth.uid())));

drop policy if exists project_portfolio_consents_insert_own on public.project_portfolio_consents;
create policy project_portfolio_consents_insert_own on public.project_portfolio_consents for insert to authenticated
with check (exists (select 1 from public.customer_projects p where p.id = project_portfolio_consents.project_id and p.user_id = (select auth.uid())));

drop policy if exists project_portfolio_consents_update_own on public.project_portfolio_consents;
create policy project_portfolio_consents_update_own on public.project_portfolio_consents for update to authenticated
using (exists (select 1 from public.customer_projects p where p.id = project_portfolio_consents.project_id and p.user_id = (select auth.uid())))
with check (exists (select 1 from public.customer_projects p where p.id = project_portfolio_consents.project_id and p.user_id = (select auth.uid())));

-- Explicit deny policies document that all remaining orchestration tables are server-owned.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'accessrevamp_agent_settings','accessrevamp_workflow_templates','project_workflow_tasks',
    'project_research_sources','project_security_authorizations','project_approval_links',
    'project_approval_selections','project_artifacts','project_provider_budgets',
    'accessrevamp_integration_outbox'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', v_table || '_deny_browser', v_table);
    execute format('create policy %I on public.%I for all to anon, authenticated using (false) with check (false)', v_table || '_deny_browser', v_table);
  end loop;
end;
$$;

comment on table public.project_workflows is 'Durable plan-specific workflow created only after a paid order exists.';
comment on table public.accessrevamp_integration_outbox is 'Idempotent external-integration queue. It does not itself send email, spend credits, charge, or refund.';
comment on table public.project_security_authorizations is 'Explicit customer authorization required before any active security testing.';
comment on table public.project_portfolio_consents is 'Optional, revocable portfolio consent; purchase alone never grants publication rights.';
