begin;

create table if not exists public.project_source_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.customer_projects(id) on delete cascade,
  asset_type text not null check (asset_type in ('product','logo','brand_photo','team_photo','testimonial','texture','reference','other')),
  product_identifier text,
  source_url text not null,
  storage_path text,
  original_filename text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  rights_status text not null default 'needs_review' check (rights_status in ('needs_review','customer_owned','licensed','public_permission','rejected')),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  retrieved_at timestamptz not null,
  verified_by text,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, sha256),
  check (verification_status <> 'verified' or (
    verified_by is not null
    and verified_at is not null
    and rights_status in ('customer_owned','licensed','public_permission')
  ))
);

create index if not exists project_source_assets_project_idx
  on public.project_source_assets (project_id, verification_status, asset_type);

create table if not exists public.project_design_option_assets (
  design_option_id uuid not null references public.project_design_options(id) on delete cascade,
  source_asset_id uuid not null references public.project_source_assets(id) on delete restrict,
  asset_role text not null check (asset_role in ('product_exact','logo_exact','brand_photo_exact','reference_only','background_generated')),
  placement_note text,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (design_option_id, source_asset_id, asset_role)
);

create index if not exists project_design_option_assets_source_idx
  on public.project_design_option_assets (source_asset_id, design_option_id);

alter table public.project_design_options
  add column if not exists copy_review_status text not null default 'needs_review'
    check (copy_review_status in ('needs_review','approved','rejected')),
  add column if not exists product_fidelity_status text not null default 'needs_review'
    check (product_fidelity_status in ('needs_review','approved','rejected')),
  add column if not exists source_manifest_verified_at timestamptz,
  add column if not exists generated_elements jsonb not null default '[]'::jsonb
    check (jsonb_typeof(generated_elements) = 'array');

create or replace function public.enforce_accessrevamp_design_fidelity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_has_exact_asset boolean;
begin
  if new.status not in ('customer_ready','selected','delivered') then
    return new;
  end if;

  if new.human_approved_by is null or new.human_approved_at is null then
    raise exception 'Human approval is required before a design can be customer-visible';
  end if;
  if new.rights_review_status <> 'approved' then
    raise exception 'Rights review must be approved before a design can be customer-visible';
  end if;
  if new.copy_review_status <> 'approved' then
    raise exception 'Displayed copy must pass spelling and content review';
  end if;
  if new.product_fidelity_status <> 'approved' then
    raise exception 'Product fidelity review must be approved';
  end if;
  if new.source_manifest_verified_at is null then
    raise exception 'The source asset manifest must be verified';
  end if;

  if new.option_group in (
    'homepage_normal',
    'homepage_cinematic',
    'cinematic_sequence',
    'cinematic_scene',
    'page_reference',
    'poster_still',
    'poster_animated'
  ) then
    select exists (
      select 1
      from public.project_design_option_assets link
      join public.project_source_assets asset on asset.id = link.source_asset_id
      where link.design_option_id = new.id
        and asset.project_id = new.project_id
        and link.asset_role in ('product_exact','logo_exact','brand_photo_exact')
        and asset.verification_status = 'verified'
        and asset.rights_status in ('customer_owned','licensed','public_permission')
    ) into v_has_exact_asset;

    if not v_has_exact_asset then
      raise exception 'No verified exact product or logo source asset is linked';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_accessrevamp_design_fidelity_trigger on public.project_design_options;
create trigger enforce_accessrevamp_design_fidelity_trigger
before insert or update of status, human_approved_by, human_approved_at,
  rights_review_status, copy_review_status, product_fidelity_status,
  source_manifest_verified_at
on public.project_design_options
for each row execute function public.enforce_accessrevamp_design_fidelity();

create or replace function public.invalidate_accessrevamp_design_asset_review()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update public.project_design_options
  set status = case when status in ('customer_ready','selected','delivered') then 'human_review' else status end,
      product_fidelity_status = 'needs_review',
      source_manifest_verified_at = null,
      updated_at = timezone('utc', now())
  where id = old.design_option_id;
  return old;
end;
$$;

drop trigger if exists invalidate_accessrevamp_design_asset_review_trigger on public.project_design_option_assets;
create trigger invalidate_accessrevamp_design_asset_review_trigger
before delete or update of source_asset_id, asset_role
on public.project_design_option_assets
for each row execute function public.invalidate_accessrevamp_design_asset_review();

create or replace function public.invalidate_accessrevamp_source_asset_review()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update public.project_design_options option
  set status = case when option.status in ('customer_ready','selected','delivered') then 'human_review' else option.status end,
      product_fidelity_status = 'needs_review',
      source_manifest_verified_at = null,
      updated_at = timezone('utc', now())
  where option.id in (
    select link.design_option_id
    from public.project_design_option_assets link
    where link.source_asset_id = old.id
  );
  return old;
end;
$$;

drop trigger if exists invalidate_accessrevamp_source_asset_review_trigger on public.project_source_assets;
create trigger invalidate_accessrevamp_source_asset_review_trigger
before delete or update of sha256, rights_status, verification_status, source_url, storage_path
on public.project_source_assets
for each row execute function public.invalidate_accessrevamp_source_asset_review();

update public.project_design_options option
set status = 'human_review',
    copy_review_status = 'needs_review',
    product_fidelity_status = 'needs_review',
    source_manifest_verified_at = null,
    updated_at = timezone('utc', now())
where option.status in ('customer_ready','selected','delivered')
  and option.option_group in (
    'homepage_normal',
    'homepage_cinematic',
    'cinematic_sequence',
    'cinematic_scene',
    'page_reference',
    'poster_still',
    'poster_animated'
  )
  and not exists (
    select 1
    from public.project_design_option_assets link
    join public.project_source_assets asset on asset.id = link.source_asset_id
    where link.design_option_id = option.id
      and link.asset_role in ('product_exact','logo_exact','brand_photo_exact')
      and asset.verification_status = 'verified'
      and asset.rights_status in ('customer_owned','licensed','public_permission')
  );

alter table public.project_source_assets enable row level security;
alter table public.project_design_option_assets enable row level security;

revoke all on table public.project_source_assets from public, anon, authenticated;
revoke all on table public.project_design_option_assets from public, anon, authenticated;
grant all on table public.project_source_assets to service_role;
grant all on table public.project_design_option_assets to service_role;

revoke all on function public.enforce_accessrevamp_design_fidelity() from public, anon, authenticated;
revoke all on function public.invalidate_accessrevamp_design_asset_review() from public, anon, authenticated;
revoke all on function public.invalidate_accessrevamp_source_asset_review() from public, anon, authenticated;
grant execute on function public.enforce_accessrevamp_design_fidelity() to service_role;
grant execute on function public.invalidate_accessrevamp_design_asset_review() to service_role;
grant execute on function public.invalidate_accessrevamp_source_asset_review() to service_role;

commit;
