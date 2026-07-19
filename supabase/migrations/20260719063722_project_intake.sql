create table if not exists public.project_intakes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.customer_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null check (plan_key in ('complete_revamp', 'cinematic_scroll')),
  selected_pages text[] not null check (cardinality(selected_pages) between 1 and 5),
  style_notes text not null check (char_length(style_notes) between 20 and 2000),
  content_notes text not null default '' check (char_length(content_notes) <= 4000),
  cinematic_notes text not null default '' check (char_length(cinematic_notes) <= 2000),
  project_notes text not null default '' check (char_length(project_notes) <= 4000),
  reference_urls text[] not null default '{}' check (cardinality(reference_urls) <= 10),
  inspiration_choices text[] not null default '{}' check (cardinality(inspiration_choices) <= 5),
  rights_confirmed_at timestamptz not null,
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'needs_information', 'approved')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_intake_assets (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.project_intakes(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 10 and 500),
  original_filename text not null check (char_length(original_filename) between 1 and 100),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  byte_size integer not null check (byte_size between 1 and 8388608),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_intakes_user_created_idx on public.project_intakes (user_id, created_at desc);
create index if not exists project_intake_assets_intake_idx on public.project_intake_assets (intake_id);

alter table public.project_intakes enable row level security;
alter table public.project_intake_assets enable row level security;

revoke all on table public.project_intakes, public.project_intake_assets from anon, authenticated;

comment on table public.project_intakes is 'Server-owned paid project brief for Complete and Cinematic customer projects.';
comment on table public.project_intake_assets is 'Private Supabase Storage metadata for project style references; browser roles have no direct access.';
