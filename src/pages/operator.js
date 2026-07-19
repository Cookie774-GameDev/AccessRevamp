import { shell } from '../components/shell.js';
import { OUTREACH_HARD_CAP, SENDING_ENABLED } from '../config/outreach-schedule.js';

export function operatorPage() {
  return shell(`<section class="dashboard-section"><div class="container-wide"><span class="eyebrow">Restricted operations</span><h1>Evidence and delivery control room</h1><div class="notice"><strong>Sending kill switch:</strong> <span data-sending-state>checking</span>. This product contains queue controls but no sending provider.</div><div class="notice"><strong>Official preparation ramp:</strong> days 1–4 target 15 reviewed drafts/day; days 5–14 target 20; day 15 onward requested target 22. The enforced ceiling remains ${OUTREACH_HARD_CAP} and sending remains ${SENDING_ENABLED ? 'enabled' : 'disabled'}. This is daily capacity for new eligible businesses, never repeated contact forever.</div><div data-operator-state="loading" data-operator-content role="region" aria-live="polite"><p>Verifying operator access…</p></div></div></section>`, { pathname: '/operator' });
}
