begin;

drop policy if exists project_creative_feedback_deny_browser on public.project_creative_feedback;
create policy project_creative_feedback_deny_browser
  on public.project_creative_feedback for all to anon, authenticated
  using (false) with check (false);

drop policy if exists project_creative_review_events_deny_browser on public.project_creative_review_events;
create policy project_creative_review_events_deny_browser
  on public.project_creative_review_events for all to anon, authenticated
  using (false) with check (false);

create index if not exists creative_feedback_author_idx
  on public.project_creative_feedback(author_id);
create index if not exists creative_feedback_option_idx
  on public.project_creative_feedback(design_option_id,created_at desc);
create index if not exists creative_feedback_task_idx
  on public.project_creative_feedback(routed_task_id) where routed_task_id is not null;
create index if not exists creative_events_actor_idx
  on public.project_creative_review_events(actor_id) where actor_id is not null;
create index if not exists creative_events_option_idx
  on public.project_creative_review_events(design_option_id,created_at desc);
create index if not exists design_options_parent_idx
  on public.project_design_options(parent_option_id) where parent_option_id is not null;
create index if not exists design_options_design_approver_idx
  on public.project_design_options(design_approved_by) where design_approved_by is not null;
create index if not exists design_options_delivery_approver_idx
  on public.project_design_options(delivery_approved_by) where delivery_approved_by is not null;

commit;
