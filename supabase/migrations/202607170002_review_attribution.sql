-- Attribute every verified finding and approved concept to an active staff user.

alter table public.ar_findings
  add column if not exists human_reviewed_by uuid references auth.users(id) on delete set null;

alter table public.ar_previews
  add column if not exists human_approved_by uuid references auth.users(id) on delete set null;

create index if not exists ar_findings_reviewer_idx
  on public.ar_findings(human_reviewed_by) where human_reviewed_by is not null;
create index if not exists ar_previews_approver_idx
  on public.ar_previews(human_approved_by) where human_approved_by is not null;

alter table public.ar_findings drop constraint if exists ar_findings_verified_consistency;
alter table public.ar_findings
  add constraint ar_findings_verified_consistency check (
    confidence <> 'verified'
    or (
      review_status = 'verified'
      and human_reviewed_at is not null
      and human_reviewed_by is not null
    )
  );

create or replace function accessrevamp_private.enforce_preview_guardrails()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' then
    if new.approved_at is null or new.human_approved_by is null or new.noindex is not true then
      raise exception 'approved previews require an approval time, active staff approver, and noindex';
    end if;

    if not exists (
      select 1
      from public.ar_staff preview_staff
      where preview_staff.user_id = new.human_approved_by
        and preview_staff.active = true
    ) then
      raise exception 'preview approver must be an active AccessRevamp staff member';
    end if;

    if not exists (
      select 1
      from public.ar_findings finding
      join public.ar_staff finding_staff
        on finding_staff.user_id = finding.human_reviewed_by
       and finding_staff.active = true
      where finding.id = new.finding_id
        and finding.prospect_id = new.prospect_id
        and finding.confidence = 'verified'
        and finding.review_status = 'verified'
        and finding.human_reviewed_at is not null
    ) then
      raise exception 'approved previews require a verified finding reviewed by active staff';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function accessrevamp_private.enforce_preview_guardrails() from public, anon, authenticated;
grant execute on function accessrevamp_private.enforce_preview_guardrails() to service_role;

drop trigger if exists ar_preview_guardrails on public.ar_previews;
create trigger ar_preview_guardrails
before insert or update on public.ar_previews
for each row execute function accessrevamp_private.enforce_preview_guardrails();

create or replace function accessrevamp_private.enforce_outreach_guardrails()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text;
  v_daily_approved integer;
begin
  if new.status in ('opted_out', 'suppressed', 'cancelled') then
    if new.status = 'opted_out' and new.opted_out_at is null then
      raise exception 'opted-out outreach requires opted_out_at';
    end if;
    return new;
  end if;

  select p.domain into v_domain
  from public.ar_prospects p
  where p.id = new.prospect_id
    and p.country = 'US'
    and p.human_verified_at is not null
    and lower(p.public_business_email) = lower(new.contact_email);

  if not found then
    raise exception 'outreach requires a human-verified U.S. prospect and the listed public business email';
  end if;

  if exists (
    select 1
    from public.ar_suppression_list s
    where lower(s.normalized_email) = lower(new.contact_email)
       or (s.scope = 'domain' and lower(s.domain) = lower(v_domain))
  ) then
    raise exception 'recipient is suppressed';
  end if;

  if new.follow_up_count = 1 and not exists (
    select 1
    from public.ar_outreach_messages prior
    where prior.prospect_id = new.prospect_id
      and prior.follow_up_count = 0
      and prior.status in ('sent', 'replied')
  ) then
    raise exception 'a follow-up requires one previously sent initial message';
  end if;

  if new.status in ('approved', 'queued', 'sent') then
    if not new.human_approval_required or new.human_approved_by is null or new.human_approved_at is null then
      raise exception 'human approval is required before outreach can advance';
    end if;

    if not exists (
      select 1
      from public.ar_staff staff
      where staff.user_id = new.human_approved_by
        and staff.active = true
    ) then
      raise exception 'outreach approver must be an active AccessRevamp staff member';
    end if;

    if new.unsubscribe_url !~* '^https://' then
      raise exception 'approved outreach requires an HTTPS unsubscribe URL';
    end if;

    if position('opt out' in lower(new.body_text)) = 0
       and position('unsubscribe' in lower(new.body_text)) = 0 then
      raise exception 'approved outreach must include a clear opt-out instruction';
    end if;

    if not exists (
      select 1
      from public.ar_previews preview
      join public.ar_staff preview_staff
        on preview_staff.user_id = preview.human_approved_by
       and preview_staff.active = true
      join public.ar_findings finding on finding.id = preview.finding_id
      join public.ar_staff finding_staff
        on finding_staff.user_id = finding.human_reviewed_by
       and finding_staff.active = true
      where preview.id = new.preview_id
        and preview.prospect_id = new.prospect_id
        and preview.status = 'approved'
        and preview.noindex = true
        and preview.approved_at is not null
        and preview.expires_at > now()
        and finding.prospect_id = new.prospect_id
        and finding.confidence = 'verified'
        and finding.review_status = 'verified'
        and finding.human_reviewed_at is not null
    ) then
      raise exception 'approved outreach requires an active-staff-reviewed finding and private preview';
    end if;
  end if;

  if new.status = 'approved' then
    if tg_op = 'INSERT' or old.status is distinct from new.status then
      perform pg_advisory_xact_lock(
        hashtextextended(
          'accessrevamp-outreach-approval-' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD'),
          0
        )
      );
      select count(*) into v_daily_approved
      from public.ar_outreach_messages m
      where m.id <> new.id
        and m.human_approved_at >= date_trunc('day', now(), 'UTC');
      if v_daily_approved >= 20 then
        raise exception 'daily outreach approval limit of 20 reached';
      end if;
    end if;
  end if;

  if new.status = 'sent' and new.sent_at is null then
    raise exception 'sent outreach requires sent_at';
  end if;

  return new;
end;
$$;
