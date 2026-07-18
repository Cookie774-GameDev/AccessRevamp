import { plans } from '../config.js';
import { escapeHtml } from '../components/icons.js';
import { getSupabase } from '../lib/supabase.js';

const empty = (title, message, action = '') => `<div class="empty-state"><h2>${title}</h2><p>${message}</p>${action}</div>`;

export function setupDashboard(navigate) {
  const host = document.querySelector('[data-dashboard-content]');
  if (!host) return undefined;
  const greeting = document.querySelector('[data-dashboard-greeting]');
  const logout = document.querySelector('[data-logout]');
  let disposed = false;

  const load = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      host.innerHTML = empty('Workspace configuration pending', 'Supabase environment values are intentionally absent from this local preview.', '<a class="button" href="/contact" data-nav>Contact AccessRevamp</a>');
      return;
    }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (disposed) return;
    if (sessionError || !session) {
      host.innerHTML = empty('Sign in to continue', 'A valid confirmed session is required to view protected customer records.', '<a class="button" href="/login" data-nav>Sign in</a>');
      greeting.textContent = sessionError ? 'Your session may have expired.' : 'A secure session is required.';
      return;
    }

    greeting.textContent = `Signed in as ${session.user.email}`;
    logout.hidden = false;
    const [projectsResult, ordersResult] = await Promise.all([
      supabase.from('customer_projects').select('id,name,status,plan_key,created_at,updated_at').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('id,plan_key,amount_total,currency,status,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }),
    ]);
    if (disposed) return;

    const projects = projectsResult.data || [];
    const orders = ordersResult.data || [];
    const partial = Boolean(projectsResult.error || ordersResult.error);
    host.innerHTML = `${partial ? '<div class="notice"><strong>Partial workspace:</strong> One protected data source could not be loaded. Available records are shown below.</div>' : ''}<div class="dashboard-grid"><section class="dashboard-card"><div class="card-head"><div><span class="micro-label">Projects</span><h2>Current work</h2></div><span class="count-pill">${projects.length}</span></div>${projects.length ? `<div class="data-list">${projects.map((project) => `<article><div><strong>${escapeHtml(project.name)}</strong><span>${escapeHtml(plans[project.plan_key]?.name || project.plan_key)}</span></div><span class="status-pill">${escapeHtml(project.status)}</span></article>`).join('')}</div>` : '<p>No project has been opened yet.</p>'}</section><section class="dashboard-card"><div class="card-head"><div><span class="micro-label">Orders</span><h2>Payment records</h2></div><span class="count-pill">${orders.length}</span></div>${orders.length ? `<div class="data-list">${orders.map((order) => `<article><div><strong>${escapeHtml(plans[order.plan_key]?.name || order.plan_key)}</strong><span>${new Date(order.created_at).toLocaleDateString()}</span></div><span>${new Intl.NumberFormat('en-US', { style: 'currency', currency: (order.currency || 'USD').toUpperCase() }).format((order.amount_total || 0) / 100)}</span></article>`).join('')}</div>` : '<p>No completed order is linked to this account.</p>'}</section></div>`;
  };

  const onLogout = async () => {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
    navigate('/');
  };
  logout?.addEventListener('click', onLogout);
  load();
  return () => {
    disposed = true;
    logout?.removeEventListener('click', onLogout);
  };
}
