import { shell } from '../components/shell.js';

export function accountProjectsPage({ pathname = '/account/projects' } = {}) {
  return shell(`<section class="dashboard-section customer-hub-page"><div class="container-wide"><div class="dashboard-head"><div><span class="eyebrow">Secure customer hub</span><h1>Your project, designs, and downloads</h1><p data-account-greeting>Checking your confirmed session…</p></div><button class="button button--ghost" type="button" data-account-logout hidden>Sign out</button></div><div data-account-state="loading" data-account-content role="region" aria-live="polite"><div class="loading-card"><p>Loading project progress, references, designs, and private files…</p></div></div><aside class="notice customer-hub-security"><strong>Private by default.</strong> Project files use expiring download links. Never share your account password or private project links.</aside></div></section>`, { pathname });
}
