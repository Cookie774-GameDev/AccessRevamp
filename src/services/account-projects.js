import '../styles/customer-hub.css';
import { getSupabase } from '../lib/supabase.js';
import { escapeHtml } from '../components/icons.js';
import { plans } from '../config.js';

const money = (cents = 0, currency = 'USD') => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: String(currency || 'USD').toUpperCase(),
}).format(cents / 100);

const show = (host, name, html) => {
  host.dataset.accountState = name;
  host.innerHTML = html;
};

const label = (value = '') => String(value)
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const date = (value, fallback = 'Not scheduled') => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(parsed)
    : fallback;
};

const dateTime = (value, fallback = '') => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
    : fallback;
};

const bytes = (value) => {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 ** 2).toFixed(1)} MB`;
};

const safeHref = (value) => {
  if (!value) return null;
  try {
    const url = new URL(value, location.origin);
    return url.protocol === 'https:' || url.origin === location.origin ? url.toString() : null;
  } catch {
    return null;
  }
};

const renderStatus = (value, extra = '') => `<span class="status-pill ${extra}">${escapeHtml(label(value || 'pending'))}</span>`;

function renderUpdates(updates = []) {
  if (!updates.length) return '<p class="portal-empty">No customer-facing updates have been published yet.</p>';
  return `<ol class="portal-timeline">${updates.map((update) => `<li>
    <span class="portal-timeline__dot" aria-hidden="true"></span>
    <div><div class="portal-timeline__head"><strong>${escapeHtml(update.title)}</strong><time datetime="${escapeHtml(update.published_at || update.created_at || '')}">${escapeHtml(dateTime(update.published_at || update.created_at))}</time></div>
    ${update.body ? `<p>${escapeHtml(update.body)}</p>` : ''}
    <div class="portal-meta">${update.stage ? `<span>${escapeHtml(label(update.stage))}</span>` : ''}${Number.isInteger(update.progress_percent) ? `<span>${update.progress_percent}% complete</span>` : ''}</div></div>
  </li>`).join('')}</ol>`;
}

function renderWorkflow(workflow) {
  if (!workflow) return '<p class="portal-empty">The workflow will appear after the project is scheduled.</p>';
  const tasks = workflow.tasks || [];
  return `<div class="portal-workflow-summary"><div><span>Current stage</span><strong>${escapeHtml(label(workflow.current_stage))}</strong></div><div><span>Workflow</span><strong>${escapeHtml(label(workflow.status))}</strong></div><div><span>Revision round</span><strong>${Number(workflow.revision_round || 0)} of 2</strong></div></div>
    ${tasks.length ? `<ol class="portal-task-list">${tasks.map((task) => `<li data-task-status="${escapeHtml(task.status)}"><span>${String(task.sequence_number).padStart(2, '0')}</span><div><strong>${escapeHtml(label(task.task_key))}</strong><small>${escapeHtml(label(task.stage))}</small></div>${renderStatus(task.status)}</li>`).join('')}</ol>` : '<p class="portal-empty">Detailed steps have not been published yet.</p>'}`;
}

function renderBrief(project) {
  const brief = project.brief;
  const canSubmit = ['complete_revamp', 'cinematic_scroll'].includes(project.plan_key);
  if (!brief) {
    return `<div class="portal-empty portal-empty--action"><p>${canSubmit ? 'Your project brief is still needed before production can begin.' : 'This service does not require the full website brief.'}</p>${canSubmit ? `<a class="button button--small" href="/project-intake?plan=${encodeURIComponent(project.plan_key)}&project=${encodeURIComponent(project.id)}" data-nav>Complete project brief</a>` : ''}</div>`;
  }

  const references = (brief.reference_urls || []).map((url) => safeHref(url)).filter(Boolean);
  const assets = brief.assets || [];
  return `<div class="portal-brief-grid">
    <div><span class="micro-label">Requested pages</span><p>${(brief.selected_pages || []).length ? brief.selected_pages.map((page) => escapeHtml(label(page))).join(' · ') : 'Not specified'}</p></div>
    <div><span class="micro-label">Style direction</span><p>${escapeHtml(brief.style_notes || 'Not specified')}</p></div>
    ${brief.content_notes ? `<div><span class="micro-label">Content notes</span><p>${escapeHtml(brief.content_notes)}</p></div>` : ''}
    ${brief.cinematic_notes ? `<div><span class="micro-label">Cinematic direction</span><p>${escapeHtml(brief.cinematic_notes)}</p></div>` : ''}
    ${brief.project_notes ? `<div><span class="micro-label">Additional requests</span><p>${escapeHtml(brief.project_notes)}</p></div>` : ''}
  </div>
  ${references.length ? `<div class="portal-link-list"><span class="micro-label">Reference websites</span>${references.map((url, index) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">Reference ${index + 1}</a>`).join('')}</div>` : ''}
  ${assets.length ? `<div class="portal-reference-grid">${assets.map((asset) => asset.preview_url ? `<a href="${escapeHtml(asset.preview_url)}" target="_blank" rel="noopener"><img src="${escapeHtml(asset.preview_url)}" alt="${escapeHtml(asset.original_filename || 'Customer reference image')}" loading="lazy"/><span>${escapeHtml(asset.original_filename || 'Reference image')}</span></a>` : '').join('')}</div>` : ''}
  ${canSubmit ? `<a class="text-link" href="/project-intake?plan=${encodeURIComponent(project.plan_key)}&project=${encodeURIComponent(project.id)}" data-nav>Update your project brief</a>` : ''}`;
}

function renderDesigns(options = []) {
  if (!options.length) return '<p class="portal-empty">Design directions will appear here after human review.</p>';
  return `<div class="portal-design-grid">${options.map((option) => {
    const url = safeHref(option.preview_url);
    return `<article class="portal-design-card"><div class="portal-design-card__preview">${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener"><img src="${escapeHtml(url)}" alt="${escapeHtml(`${label(option.option_group)} option ${option.option_number}`)}" loading="lazy"/></a>` : '<div class="portal-file-icon">Preview pending</div>'}</div><div><span class="micro-label">${escapeHtml(label(option.option_group))}</span><h4>Option ${Number(option.option_number)}</h4><p>Revision ${Number(option.revision_round || 0)}${option.scene_number ? ` · Scene ${Number(option.scene_number)}` : ''}</p>${renderStatus(option.status)}</div></article>`;
  }).join('')}</div>`;
}

function renderArtifactPreview(artifact) {
  const preview = safeHref(artifact.preview_url);
  if (!preview) return '<div class="portal-file-icon" aria-hidden="true">FILE</div>';
  if (artifact.mime_type?.startsWith('image/')) return `<img src="${escapeHtml(preview)}" alt="" loading="lazy"/>`;
  if (artifact.mime_type?.startsWith('video/')) return `<video src="${escapeHtml(preview)}" controls preload="metadata" playsinline></video>`;
  return '<div class="portal-file-icon" aria-hidden="true">VIEW</div>';
}

function renderArtifacts(artifacts = []) {
  if (!artifacts.length) return '<p class="portal-empty">No approved files are available yet.</p>';
  return `<div class="portal-file-grid">${artifacts.map((artifact) => {
    const download = safeHref(artifact.download_url);
    const title = artifact.metadata?.title || artifact.filename || label(artifact.artifact_type);
    const description = artifact.metadata?.description || '';
    return `<article class="portal-file-card"><div class="portal-file-card__preview">${renderArtifactPreview(artifact)}</div><div class="portal-file-card__body"><span class="micro-label">${escapeHtml(label(artifact.artifact_type))}</span><h4>${escapeHtml(title)}</h4>${description ? `<p>${escapeHtml(description)}</p>` : ''}<div class="portal-meta"><span>${escapeHtml(artifact.filename || '')}</span><span>${escapeHtml(bytes(artifact.size_bytes))}</span><span>${escapeHtml(date(artifact.created_at))}</span></div>${download ? `<a class="button button--small" href="${escapeHtml(download)}" target="_blank" rel="noopener" download>Download</a>` : '<span class="status-pill">Link unavailable</span>'}</div></article>`;
  }).join('')}</div>`;
}

function renderDeliveries(deliveries = []) {
  if (!deliveries.length) return '';
  return `<div class="portal-delivery-list">${deliveries.map((delivery) => {
    const url = safeHref(delivery.drive_url);
    return `<article><div><span class="micro-label">${escapeHtml(label(delivery.delivery_type))} · Version ${Number(delivery.version)}</span><strong>${escapeHtml(label(delivery.status))}</strong><small>${escapeHtml(dateTime(delivery.delivered_at || delivery.created_at))}</small></div>${url ? `<a class="button button--small" href="${escapeHtml(url)}" target="_blank" rel="noopener">Open delivery</a>` : ''}</article>`;
  }).join('')}</div>`;
}

function renderProject(project) {
  const progress = Math.max(0, Math.min(100, Number(project.progress_percent || 0)));
  const due = project.delivery_due_at ? date(project.delivery_due_at) : 'Not scheduled';
  const latest = project.latest_update;
  const website = safeHref(project.website_url);
  return `<article class="customer-project" data-project-id="${escapeHtml(project.id)}">
    <header class="customer-project__header"><div><span class="eyebrow">${escapeHtml(plans[project.plan_key]?.name || label(project.plan_key))}</span><h2>${escapeHtml(project.name)}</h2><p>${escapeHtml(project.scope_summary || 'Your project scope and production record will be kept here.')}</p></div><div class="customer-project__status">${renderStatus(project.status)}${renderStatus(project.delivery_status, 'status-pill--secondary')}</div></header>
    <div class="portal-progress"><div class="portal-progress__head"><strong>${progress}% complete</strong><span>${latest?.stage ? escapeHtml(label(latest.stage)) : escapeHtml(label(project.status))}</span></div><div class="portal-progress__track" role="progressbar" aria-label="Project progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div></div>
    <div class="portal-facts"><div><span>Last updated</span><strong>${escapeHtml(date(project.updated_at))}</strong></div><div><span>Estimated delivery</span><strong>${escapeHtml(due)}</strong></div><div><span>Revision allowance</span><strong>${Number(project.revision_limit || 0)} round${Number(project.revision_limit || 0) === 1 ? '' : 's'}</strong></div>${website ? `<div><span>Current website</span><a href="${escapeHtml(website)}" target="_blank" rel="noopener">Open website</a></div>` : ''}</div>
    <div class="portal-sections">
      <details open><summary>Project updates <span>${(project.updates || []).length}</span></summary><div class="portal-section-body">${renderUpdates(project.updates)}</div></details>
      <details><summary>Production progress <span>${project.workflow?.tasks?.length || 0}</span></summary><div class="portal-section-body">${renderWorkflow(project.workflow)}</div></details>
      <details><summary>Your brief and references <span>${project.brief?.assets?.length || 0}</span></summary><div class="portal-section-body">${renderBrief(project)}</div></details>
      <details><summary>Designs for review <span>${project.design_options?.length || 0}</span></summary><div class="portal-section-body">${renderDesigns(project.design_options)}</div></details>
      <details open><summary>Files and website downloads <span>${project.artifacts?.length || 0}</span></summary><div class="portal-section-body">${renderArtifacts(project.artifacts)}${renderDeliveries(project.deliveries)}</div></details>
    </div>
  </article>`;
}

function renderWorkspace(result) {
  const projects = result.projects || [];
  const orders = result.orders || [];
  const refunds = result.refundRequests || [];
  const partial = result.partialFailures?.length
    ? `<div class="notice"><strong>Some workspace sections are temporarily unavailable:</strong> ${result.partialFailures.map(escapeHtml).join(', ')}.</div>`
    : '';

  const entitlement = result.entitlement
    ? `${escapeHtml(label(result.entitlement.highest_tier_key))} · ${escapeHtml(label(result.entitlement.status))} · ${money(result.entitlement.effective_paid_cents)}`
    : 'No paid entitlement is linked yet.';

  return `${partial}<div class="customer-hub-summary"><section><span class="micro-label">Current entitlement</span><strong>${entitlement}</strong></section><section><span class="micro-label">Projects</span><strong>${projects.length}</strong></section><section><span class="micro-label">Secure download links</span><strong>Refresh every ${Math.round((result.signedUrlExpiresIn || 900) / 60)} minutes</strong></section><button class="button button--ghost button--small" type="button" data-hub-refresh>Refresh workspace</button></div>
    ${projects.length ? `<div class="customer-project-list">${projects.map(renderProject).join('')}</div>` : '<div class="empty-state"><h2>No project has been opened yet</h2><p>Use the same confirmed email used at checkout. Once a paid project is created, its progress and files will appear here automatically.</p><a class="button" href="/pricing" data-nav>Review service options</a></div>'}
    <details class="portal-account-records"><summary>Orders and account records</summary><div class="dashboard-grid"><section class="dashboard-card"><h2>Verified orders</h2>${orders.length ? `<ul>${orders.map((order) => `<li>${escapeHtml(label(order.plan_key))} — ${money(order.amount_total, order.currency)} — ${escapeHtml(label(order.status))}</li>`).join('')}</ul>` : '<p>No verified order yet.</p>'}</section><section class="dashboard-card"><h2>Refund requests</h2>${refunds.length ? `<ul>${refunds.map((refund) => `<li>${escapeHtml(refund.reason || 'Request')} — ${escapeHtml(label(refund.status))}</li>`).join('')}</ul>` : '<p>No refund request is on file.</p>'}</section></div></details>`;
}

export function setupAccountProjects(navigate) {
  const host = document.querySelector('[data-account-content]');
  if (!host) return undefined;
  const logout = document.querySelector('[data-account-logout]');
  const greeting = document.querySelector('[data-account-greeting]');
  let disposed = false;

  const load = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      show(host, 'configuration-missing', '<h2>Workspace temporarily unavailable</h2><p>The secure customer service is not configured on this deployment.</p>');
      return;
    }

    show(host, 'loading', '<div class="loading-card" role="status"><p>Loading your private project workspace…</p></div>');
    const sessionResult = await supabase.auth.getSession();
    if (disposed) return;
    const session = sessionResult.data?.session;
    if (sessionResult.error || !session) {
      show(host, 'signed-out', '<h2>Sign in to continue</h2><p>Your projects and files are private.</p><p><a class="button" href="/login" data-nav>Sign in</a></p>');
      if (greeting) greeting.textContent = 'A secure session is required.';
      return;
    }
    if (!session.user.email_confirmed_at) {
      show(host, 'confirmation-required', '<h2>Confirm your email</h2><p>Open the confirmation email before viewing customer records.</p>');
      return;
    }

    if (logout) logout.hidden = false;
    if (greeting) greeting.textContent = `Signed in as ${session.user.email}`;
    try {
      const response = await fetch('/api/account-projects', {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      if (response.status === 401) {
        show(host, 'session-expired', '<h2>Your session expired</h2><p>Please sign in again.</p>');
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Workspace unavailable');
      if (disposed) return;
      show(host, result.projects?.length ? 'populated' : 'empty', renderWorkspace(result));
    } catch (error) {
      show(host, 'unavailable', `<h2>Workspace unavailable</h2><p>${escapeHtml(error.message || 'The workspace could not load.')}</p>`);
    }
  };

  const onLogout = async () => {
    await getSupabase()?.auth.signOut();
    navigate('/');
  };
  const onHostClick = (event) => {
    if (event.target.closest('[data-hub-refresh]')) load();
  };

  logout?.addEventListener('click', onLogout);
  host.addEventListener('click', onHostClick);
  load();
  return () => {
    disposed = true;
    logout?.removeEventListener('click', onLogout);
    host.removeEventListener('click', onHostClick);
  };
}
