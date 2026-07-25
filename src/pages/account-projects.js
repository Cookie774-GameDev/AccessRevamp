import { shell } from '../components/shell.js';

export function accountProjectsPage({ pathname = '/account/projects' } = {}) {
  return shell(`<section class="customer-hub-page"><div class="container-wide"><header class="customer-workspace-head"><div><span class="eyebrow">Project workspace</span><h1>Dashboard</h1><p data-account-greeting>Checking your confirmed session…</p></div></header><div data-account-state="loading" data-account-content role="region" aria-live="polite"><div class="loading-card"><p>Loading your projects, progress, and private files…</p></div></div><aside class="notice customer-hub-security"><strong>Private by default.</strong> Project files use expiring download links. Never share your account password or private project links.</aside></div></section>`, { pathname });
}
