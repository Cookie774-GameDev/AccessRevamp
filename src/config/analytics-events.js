export const ANALYTICS_EVENTS = new Set([
  'free_snapshot_started', 'preview_viewed', 'plan_viewed', 'plan_selected',
  'checkout_started', 'checkout_completed', 'upgrade_credit_applied',
  'contact_submitted', 'intake_completed', 'portfolio_demo_opened',
  'quote_started', 'quote_completed', 'emergency_call_clicked', 'cart_opened',
  'demo_checkout_started', 'service_area_checked', 'call_clicked',
  'schedule_requested', 'heat_filter_changed', 'product_viewed', 'cart_item_added',
  'service_path_selected', 'water_loss_checked', 'eta_checked'
]);

export const ANALYTICS_PROPERTY_KEYS = new Set([
  'route', 'tier', 'status', 'demo', 'action', 'step', 'category', 'utm_source',
  'utm_medium', 'utm_campaign'
]);
