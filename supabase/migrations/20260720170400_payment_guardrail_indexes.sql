drop index if exists public.orders_checkout_request_id_unique;
drop index if exists public.refund_requests_one_open_per_order;
drop index if exists public.upgrade_reservations_user_request_unique;

create index if not exists payment_runtime_settings_updated_by_idx
  on public.payment_runtime_settings (updated_by);
create index if not exists payment_security_incidents_order_id_idx
  on public.payment_security_incidents (order_id);
create index if not exists payment_security_incidents_resolved_by_idx
  on public.payment_security_incidents (resolved_by);
create index if not exists refund_authorizations_requested_by_idx
  on public.refund_authorizations (requested_by);
create index if not exists refund_authorizations_approved_by_idx
  on public.refund_authorizations (approved_by);
create index if not exists refund_authorizations_executed_by_idx
  on public.refund_authorizations (executed_by);
