insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-intake-assets',
  'project-intake-assets',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.project_intake_assets is
  'Metadata for the private project-intake-assets Storage bucket; only server-owned flows may access it.';
