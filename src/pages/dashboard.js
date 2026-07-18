import { shell } from '../components/shell.js';

export function dashboardPage() {
  return shell(`<section class="dashboard-section"><div class="container-wide"><div class="dashboard-head"><div><span class="eyebrow">Customer workspace</span><h1>Your AccessRevamp dashboard</h1><p data-dashboard-greeting>Checking your secure session…</p></div><button class="button button--ghost" type="button" data-logout hidden>Sign out</button></div><div data-dashboard-content><div class="loading-card" role="status"><p>Loading project and order records…</p></div></div></div></section>`, { pathname: '/dashboard' });
}
