begin;

-- These false permissive policies never restricted the customer SELECT
-- policies; they only caused duplicate policy evaluation. RLS still denies
-- every operation for which no affirmative policy exists.
drop policy if exists project_artifacts_deny_browser
  on public.project_artifacts;
drop policy if exists server_only_deny_browser
  on public.project_intake_assets;
drop policy if exists server_only_deny_browser
  on public.project_intakes;
drop policy if exists project_workflow_tasks_deny_browser
  on public.project_workflow_tasks;

commit;
