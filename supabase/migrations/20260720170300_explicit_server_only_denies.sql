do $$
declare
  v_table text;
  v_tables text[] := array[
    'accessrevamp_audit_log',
    'accessrevamp_operators',
    'accessrevamp_outreach_queue',
    'contact_rate_limits',
    'contact_submissions',
    'finding_evidence',
    'findings',
    'free_snapshot_requests',
    'order_draft_assets',
    'order_drafts',
    'outreach_queue',
    'outreach_settings',
    'payment_refunds',
    'payment_runtime_settings',
    'payment_security_incidents',
    'previews',
    'private_pricing_contexts',
    'private_pricing_resolution_limits',
    'project_intake_assets',
    'project_intakes',
    'prospects',
    'refund_authorizations',
    'refund_dependencies',
    'stripe_events',
    'stripe_price_catalog',
    'suppression_list',
    'tier_catalog',
    'upgrade_reservations'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('drop policy if exists server_only_deny_browser on public.%I', v_table);
      execute format(
        'create policy server_only_deny_browser on public.%I for all to anon, authenticated using (false) with check (false)',
        v_table
      );
    end if;
  end loop;
end;
$$;
