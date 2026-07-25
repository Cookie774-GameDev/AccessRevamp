create index if not exists production_readiness_settings_updated_by_idx
  on public.production_readiness_settings (updated_by);
