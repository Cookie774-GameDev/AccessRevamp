alter table public.marketing_creatives
  add column if not exists asset_kind text not null default 'still_poster';

alter table public.marketing_creatives drop constraint if exists marketing_creatives_creative_number_check;
alter table public.marketing_creatives
  add constraint marketing_creatives_creative_number_check check (creative_number between 1 and 20);

alter table public.marketing_creatives drop constraint if exists marketing_creatives_format_key_check;
alter table public.marketing_creatives
  add constraint marketing_creatives_format_key_check check (format_key in (
    'square_1080x1080',
    'portrait_1080x1350',
    'story_1080x1920',
    'landscape_1200x628',
    'poster_letter_a4',
    'motion_story_1080x1920',
    'business_card_front_back',
    'brochure_trifold',
    'brochure_bifold'
  ));

alter table public.marketing_creatives drop constraint if exists marketing_creatives_asset_kind_check;
alter table public.marketing_creatives
  add constraint marketing_creatives_asset_kind_check check (asset_kind in (
    'motion_poster',
    'still_poster',
    'business_card',
    'brochure'
  ));

update public.customer_projects
   set creative_pack_status = 'waiting_for_inputs'
 where plan_key in ('homepage_reveal', 'complete_revamp', 'cinematic_scroll')
   and creative_pack_status = 'not_applicable';

create or replace function public.enforce_accessrevamp_marketing_creative()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan_key text;
begin
  select customer_projects.plan_key
    into v_plan_key
    from public.customer_projects
   where customer_projects.id = new.project_id;

  if not found then
    raise exception 'AccessRevamp project not found';
  end if;

  if v_plan_key = 'homepage_reveal'
     and (new.creative_number <> 1 or new.asset_kind <> 'motion_poster') then
    raise exception 'Homepage Reveal includes one motion poster creative';
  end if;

  if v_plan_key = 'quick_fix'
     and (new.creative_number > 10 or new.asset_kind <> 'still_poster') then
    raise exception 'Legacy Quick Fix projects retain the original ten still creatives';
  end if;

  if v_plan_key not in ('homepage_reveal', 'quick_fix', 'complete_revamp', 'cinematic_scroll') then
    raise exception 'Creative bundle is not available for this project';
  end if;

  if new.status in ('approved', 'delivered')
     and new.rights_review_status not in ('approved_client_assets', 'approved_free_assets') then
    raise exception 'Creative asset rights must be reviewed before approval or delivery';
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.enforce_accessrevamp_marketing_creative() from public, anon, authenticated;
grant execute on function public.enforce_accessrevamp_marketing_creative() to service_role;

comment on table public.marketing_creatives is
  'Human-reviewed creative bundle records: one motion poster for Homepage Reveal; five motion posters, ten still posters, three business-card variations, and two brochure variations for Complete and Cinematic projects.';

comment on column public.marketing_creatives.asset_kind is
  'Distinguishes motion posters, still posters, business cards, and brochures without treating format adaptations as unrelated campaigns.';
