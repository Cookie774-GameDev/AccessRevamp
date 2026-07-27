begin;

drop policy if exists project_source_assets_deny_browser
  on public.project_source_assets;
create policy project_source_assets_deny_browser
  on public.project_source_assets
  for all to anon, authenticated
  using (false) with check (false);

drop policy if exists project_design_option_assets_deny_browser
  on public.project_design_option_assets;
create policy project_design_option_assets_deny_browser
  on public.project_design_option_assets
  for all to anon, authenticated
  using (false) with check (false);

commit;
