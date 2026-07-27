import '../styles/customer-hub.css';
import { getSupabase } from '../lib/supabase.js';
import { escapeHtml } from '../components/icons.js';
import { plans } from '../config.js';
import { renderWorkspace as renderTabbedWorkspace } from './customer-workspace-renderer.js';

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

const SIGNED_PREVIEW_RENEWAL_BUFFER_SECONDS = 180;

export function signedPreviewRefreshDelay(signedUrlExpiresIn = 900) {
  const expiresIn = Number(signedUrlExpiresIn);
  const safeExpiresIn = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 900;
  return Math.max(60, safeExpiresIn - SIGNED_PREVIEW_RENEWAL_BUFFER_SECONDS) * 1000;
}

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

function renderDesignCards(options = []) {
  if (!options.length) return '<p class="portal-empty">Design directions will appear here after human review.</p>';
  return `<div class="portal-design-grid">${options.map((option) => {
    const url = safeHref(option.preview_url);
    return `<article class="portal-design-card"><div class="portal-design-card__preview">${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener"><img src="${escapeHtml(url)}" alt="${escapeHtml(`${label(option.option_group)} option ${option.option_number}`)}" loading="lazy"/></a>` : '<div class="portal-file-icon">Preview pending</div>'}</div><div><span class="micro-label">${escapeHtml(label(option.option_group))}</span><h4>Option ${Number(option.option_number)}</h4><p>Revision ${Number(option.revision_round || 0)}${option.scene_number ? ` · Scene ${Number(option.scene_number)}` : ''}</p>${renderStatus(option.status)}</div></article>`;
  }).join('')}</div>`;
}

const renderChoiceOptions = (options) => `<option value="">No selection</option>${options.map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(`${label(option.option_group)} option ${option.option_number}`)}</option>`).join('')}`;

function renderDesigns(options = [], feedback = []) {
  if (!options.length) return renderDesignCards(options);
  const latestRound = Math.max(...options.map((option) => Number(option.revision_round || 0)));
  const currentOptions = options.filter((option) => Number(option.revision_round || 0) === latestRound);
  const optionGroup = currentOptions[0]?.option_group || 'homepage';
  const requestsUsed = feedback.filter((entry) => entry.action === 'request_more').length;
  const choices = renderChoiceOptions(currentOptions);
  return `${renderDesignCards(options)}
    <form class="portal-design-feedback" data-design-feedback-form data-option-group="${escapeHtml(optionGroup)}" data-revision-round="${latestRound}">
      <div><span class="micro-label">Rank your favorites</span><h4>Choose up to three directions</h4><p>Your first choice becomes the selected direction after the project and account checks pass.</p></div>
      <label>First choice<select name="firstChoice" required>${choices}</select></label>
      <label>Second choice<select name="secondChoice">${choices}</select></label>
      <label>Third choice<select name="thirdChoice">${choices}</select></label>
      <label class="portal-feedback-notes">Notes for the design team<textarea name="notes" maxlength="3000" rows="4" placeholder="Tell us what you like, what to combine, or what to avoid."></textarea></label>
      <div class="portal-feedback-actions"><button class="button button--small" type="submit">Save design choices</button><button class="button button--ghost button--small" type="button" data-request-more-designs ${requestsUsed >= 2 ? 'disabled' : ''}>Request five new directions</button><span class="form-status" role="status" aria-live="polite">${requestsUsed} of 2 additional rounds requested</span></div>
    </form>`;
}

function renderSpecialRequests(project) {
  const requests = (project.feedback || []).filter((entry) => entry.action === 'special_request');
  return `<form class="portal-special-request" data-special-request-form>
    <div><span class="micro-label">Special request</span><h4>Send production-specific direction</h4><p>This request is attached only to this verified customer project.</p></div>
    <label>Request<textarea name="notes" minlength="10" maxlength="3000" rows="5" required placeholder="Describe the change, reference, content, or delivery detail you need."></textarea></label>
    <div class="portal-feedback-actions"><button class="button button--small" type="submit">Send request</button><span class="form-status" role="status" aria-live="polite">${requests.length ? `${requests.length} request${requests.length === 1 ? '' : 's'} recorded` : ''}</span></div>
  </form>`;
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

function projectNextAction(project) {
  if (['complete_revamp', 'cinematic_scroll'].includes(project.plan_key) && !project.brief) {
    return {
      label: 'Complete your project questions',
      href: `/project-intake?plan=${encodeURIComponent(project.plan_key)}&project=${encodeURIComponent(project.id)}`,
    };
  }
  if ((project.design_options || []).some((option) => option.status === 'customer_ready')) {
    return { label: 'Review your design options', section: 'designs' };
  }
  if ((project.artifacts || []).length || (project.deliveries || []).length) {
    return { label: 'Review your latest delivery', section: 'deliveries' };
  }
  return { label: 'Follow production progress', section: 'progress' };
}

function renderProject(project) {
  const progress = Math.max(0, Math.min(100, Number(project.progress_percent || 0)));
  const due = project.delivery_due_at ? date(project.delivery_due_at) : 'Not scheduled';
  const latest = project.latest_update;
  const website = safeHref(project.website_url);
  const nextAction = projectNextAction(project);
  const nextActionControl = nextAction.href
    ? `<a class="button button--small" href="${escapeHtml(nextAction.href)}" data-nav>${escapeHtml(nextAction.label)}</a>`
    : `<button class="button button--small" type="button" data-project-section="${escapeHtml(nextAction.section)}">${escapeHtml(nextAction.label)}</button>`;
  return `<article class="customer-project customer-workspace__canvas" data-project-id="${escapeHtml(project.id)}" tabindex="-1">
    <header class="customer-project__header"><div><span class="eyebrow">${escapeHtml(plans[project.plan_key]?.name || label(project.plan_key))}</span><h2>${escapeHtml(project.name)}</h2><p>${escapeHtml(project.scope_summary || 'Your project scope and production record will be kept here.')}</p></div><div class="customer-project__status">${renderStatus(project.status)}${renderStatus(project.delivery_status, 'status-pill--secondary')}</div></header>
    <section class="customer-next-action"><div><span class="micro-label">Next action</span><strong>${escapeHtml(nextAction.label)}</strong><p>${latest?.body ? escapeHtml(latest.body) : 'Your workspace will always point to the next useful step.'}</p></div>${nextActionControl}</section>
    <div class="portal-progress"><div class="portal-progress__head"><strong>${progress}% complete</strong><span>${latest?.stage ? escapeHtml(label(latest.stage)) : escapeHtml(label(project.status))}</span></div><div class="portal-progress__track" role="progressbar" aria-label="Project progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div></div>
    <div class="portal-facts"><div><span>Last updated</span><strong>${escapeHtml(date(project.updated_at))}</strong></div><div><span>Estimated delivery</span><strong>${escapeHtml(due)}</strong></div><div><span>Revision allowance</span><strong>${Number(project.revision_limit || 0)} round${Number(project.revision_limit || 0) === 1 ? '' : 's'}</strong></div>${website ? `<div><span>Current website</span><a href="${escapeHtml(website)}" target="_blank" rel="noopener">Open website</a></div>` : ''}</div>
    <div class="portal-sections">
      <details open><summary>Project updates <span>${(project.updates || []).length}</span></summary><div class="portal-section-body">${renderUpdates(project.updates)}</div></details>
      <details data-project-panel="progress"><summary>Production progress <span>${project.workflow?.tasks?.length || 0}</span></summary><div class="portal-section-body">${renderWorkflow(project.workflow)}</div></details>
      <details data-project-panel="questions"><summary>Project questions and references <span>${project.brief?.assets?.length || 0}</span></summary><div class="portal-section-body">${renderBrief(project)}</div></details>
      <details data-project-panel="designs"><summary>Designs for review <span>${project.design_options?.length || 0}</span></summary><div class="portal-section-body">${renderDesigns(project.design_options, project.feedback)}</div></details>
      <details><summary>Special requests <span>${(project.feedback || []).filter((entry) => entry.action === 'special_request').length}</span></summary><div class="portal-section-body">${renderSpecialRequests(project)}</div></details>
      <details open data-project-panel="deliveries"><summary>Files and website downloads <span>${project.artifacts?.length || 0}</span></summary><div class="portal-section-body">${renderArtifacts(project.artifacts)}${renderDeliveries(project.deliveries)}</div></details>
    </div>
  </article>`;
}

function renderProjectRail(projects, selectedProjectId) {
  return `<nav class="customer-workspace__rail" aria-label="Your projects"><div class="customer-workspace__rail-head"><span class="micro-label">Projects</span><strong>${projects.length}</strong></div>${projects.map((project) => {
    const selected = project.id === selectedProjectId;
    const progress = Math.max(0, Math.min(100, Number(project.progress_percent || 0)));
    return `<button type="button" data-project-select="${escapeHtml(project.id)}"${selected ? ' aria-current="page"' : ''}><span>${escapeHtml(project.name)}</span><small>${escapeHtml(plans[project.plan_key]?.name || label(project.plan_key))}</small><i><b style="width:${progress}%"></b></i><em>${progress}%</em></button>`;
  }).join('')}<a class="customer-workspace__new-project" href="/pricing" data-nav>Start another project</a></nav>`;
}

function renderWorkspace(result, selectedProjectId = '') {
  const projects = result.projects || [];
  const orders = result.orders || [];
  const refunds = result.refundRequests || [];
  const partial = result.partialFailures?.length
    ? `<div class="notice"><strong>Some workspace sections are temporarily unavailable:</strong> ${result.partialFailures.map(escapeHtml).join(', ')}.</div>`
    : '';

  const entitlement = result.entitlement
    ? `${escapeHtml(label(result.entitlement.highest_tier_key))} · ${escapeHtml(label(result.entitlement.status))} · ${money(result.entitlement.effective_paid_cents)}`
    : 'No paid entitlement is linked yet.';

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0];
  return `${partial}<div class="customer-hub-summary"><section><span class="micro-label">Current entitlement</span><strong>${entitlement}</strong></section><section><span class="micro-label">Secure files</span><strong>Links refresh every ${Math.round((result.signedUrlExpiresIn || 900) / 60)} minutes</strong></section><button class="button button--ghost button--small" type="button" data-hub-refresh>Refresh workspace</button></div>
    ${selectedProject ? `<div class="customer-workspace">${renderProjectRail(projects, selectedProject.id)}${renderProject(selectedProject)}</div>` : '<div class="empty-state"><h2>No project has been opened yet</h2><p>Use the same confirmed email used at checkout. A signature-verified paid order creates its project folder here automatically.</p><a class="button" href="/pricing" data-nav>Review service options</a></div>'}
    <details class="portal-account-records"><summary>Orders and account records</summary><div class="dashboard-grid"><section class="dashboard-card"><h2>Verified orders</h2>${orders.length ? `<ul>${orders.map((order) => `<li>${escapeHtml(label(order.plan_key))} — ${money(order.amount_total, order.currency)} — ${escapeHtml(label(order.status))}</li>`).join('')}</ul>` : '<p>No verified order yet.</p>'}</section><section class="dashboard-card"><h2>Refund requests</h2>${refunds.length ? `<ul>${refunds.map((refund) => `<li>${escapeHtml(refund.reason || 'Request')} — ${escapeHtml(label(refund.status))}</li>`).join('')}</ul>` : '<p>No refund request is on file.</p>'}</section></div></details>`;
}

export function setupAccountProjects(navigate) {
  const host = document.querySelector('[data-account-content]');
  if (!host) return undefined;
  const greeting = document.querySelector('[data-account-greeting]');
  let disposed = false;
  let activeSession = null;
  let workspaceResult = null;
  let selectedProjectId = new URLSearchParams(location.search).get('project') || '';
  let activeWorkspaceTab = 'projects';
  let activeProjectTab = '';
  let designChooser = { open: false, rankedOptionIds: [], expandedOptionId: '' };
  let signedPreviewRefreshTimer = null;
  let hasRetriedBrokenPreview = false;

  const scheduleSignedPreviewRefresh = (expiresIn) => {
    if (signedPreviewRefreshTimer) clearTimeout(signedPreviewRefreshTimer);
    signedPreviewRefreshTimer = setTimeout(() => {
      if (!disposed) void load();
    }, signedPreviewRefreshDelay(expiresIn));
  };

  const renderCurrentWorkspace = () => {
    if (!workspaceResult) return;
    const projects = workspaceResult.projects || [];
    const selected = projects.find((project) => project.id === selectedProjectId) || projects[0] || null;
    selectedProjectId = selected?.id || '';
    show(host, projects.length ? 'populated' : 'empty', renderTabbedWorkspace(
      workspaceResult,
      selectedProjectId,
      activeWorkspaceTab,
      activeProjectTab,
      { designChooser },
    ));
    document.body.classList.toggle('has-design-chooser', designChooser.open);
  };

  const saveFeedback = async (form, payload) => {
    const status = form.querySelector('.form-status');
    const controls = form.querySelectorAll('button, select, textarea');
    controls.forEach((control) => { control.disabled = true; });
    if (status) status.textContent = 'Saving securely…';
    try {
      const response = await fetch('/api/account-project-feedback', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${activeSession.access_token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ ...payload, requestId: crypto.randomUUID() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your request could not be saved.');
      if (status) status.textContent = 'Saved. The production team can now review it.';
      await load();
      return true;
    } catch (error) {
      controls.forEach((control) => { control.disabled = false; });
      if (status) status.textContent = error.message || 'Your request could not be saved.';
      return false;
    }
  };

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
    activeSession = session;
    if (!session.user.email_confirmed_at) {
      show(host, 'confirmation-required', '<h2>Confirm your email</h2><p>Open the confirmation email before viewing customer records.</p>');
      return;
    }

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
      workspaceResult = result;
      workspaceResult.profile = {
        ...(result.profile || {}),
        email: session.user.email,
      };
      renderCurrentWorkspace();
      scheduleSignedPreviewRefresh(result.signedUrlExpiresIn);
    } catch (error) {
      show(host, 'unavailable', `<h2>Workspace unavailable</h2><p>${escapeHtml(error.message || 'The workspace could not load.')}</p>`);
    }
  };

  const onHostClick = async (event) => {
    const signoutStart = event.target.closest('[data-settings-signout]');
    if (signoutStart) {
      const confirmation = host.querySelector('[data-signout-confirm]');
      if (confirmation) {
        confirmation.hidden = false;
        confirmation.querySelector('[data-signout-approve]')?.focus();
      }
      return;
    }
    const signoutCancel = event.target.closest('[data-signout-cancel]');
    if (signoutCancel) {
      const confirmation = signoutCancel.closest('[data-signout-confirm]');
      if (confirmation) confirmation.hidden = true;
      host.querySelector('[data-settings-signout]')?.focus();
      return;
    }
    const signoutApprove = event.target.closest('[data-signout-approve]');
    if (signoutApprove) {
      signoutApprove.disabled = true;
      signoutApprove.textContent = 'Signing out…';
      await getSupabase()?.auth.signOut();
      navigate('/');
      return;
    }
    const workspaceTab = event.target.closest('[data-workspace-tab]');
    if (workspaceTab && workspaceResult) {
      activeWorkspaceTab = workspaceTab.dataset.workspaceTab;
      renderCurrentWorkspace();
      return;
    }
    const projectTab = event.target.closest('[data-project-tab]');
    if (projectTab && workspaceResult) {
      activeProjectTab = projectTab.dataset.projectTab;
      renderCurrentWorkspace();
      return;
    }
    const projectButton = event.target.closest('[data-project-select]');
    if (projectButton && workspaceResult) {
      selectedProjectId = projectButton.dataset.projectSelect;
      activeWorkspaceTab = 'projects';
      activeProjectTab = '';
      designChooser = { open: false, rankedOptionIds: [], expandedOptionId: '' };
      const url = new URL(location.href);
      url.searchParams.set('project', selectedProjectId);
      history.replaceState({}, '', `${url.pathname}${url.search}`);
      renderCurrentWorkspace();
      host.querySelector('.customer-workspace__canvas')?.focus({ preventScroll: true });
      return;
    }
    const sectionButton = event.target.closest('[data-project-section]');
    if (sectionButton) {
      activeWorkspaceTab = 'projects';
      activeProjectTab = sectionButton.dataset.projectSection === 'audit' ? 'audit' : 'website';
      renderCurrentWorkspace();
      host.querySelector(`[data-project-panel="${activeProjectTab}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (event.target.closest('[data-hub-refresh]')) {
      await load();
      return;
    }
    if (event.target.closest('[data-open-design-chooser]')) {
      designChooser = { open: true, rankedOptionIds: [], expandedOptionId: '' };
      renderCurrentWorkspace();
      return;
    }
    const previewOpen = event.target.closest('[data-design-preview-open]');
    if (previewOpen && designChooser.open) {
      designChooser = {
        ...designChooser,
        expandedOptionId: previewOpen.dataset.designPreviewOpen,
      };
      renderCurrentWorkspace();
      return;
    }
    if (event.target.closest('[data-design-preview-close]')) {
      designChooser = { ...designChooser, expandedOptionId: '' };
      renderCurrentWorkspace();
      return;
    }
    if (event.target.closest('[data-design-chooser-close]')) {
      designChooser = { open: false, rankedOptionIds: [], expandedOptionId: '' };
      renderCurrentWorkspace();
      return;
    }
    if (event.target.closest('[data-design-chooser-back]')) {
      designChooser = {
        open: true,
        rankedOptionIds: designChooser.rankedOptionIds.slice(0, -1),
        expandedOptionId: '',
      };
      renderCurrentWorkspace();
      return;
    }
    const rankOption = event.target.closest('[data-design-rank-option]');
    if (rankOption && designChooser.open && !designChooser.rankedOptionIds.includes(rankOption.dataset.designRankOption)) {
      designChooser = {
        open: true,
        rankedOptionIds: [...designChooser.rankedOptionIds, rankOption.dataset.designRankOption].slice(0, 3),
        expandedOptionId: '',
      };
      renderCurrentWorkspace();
      return;
    }
    const finishButton = event.target.closest('[data-website-finish]');
    if (finishButton) {
      finishButton.disabled = true;
      finishButton.textContent = 'Saved';
      const status = finishButton.closest('form')?.querySelector('.form-status');
      if (status) status.textContent = 'Your rankings are saved. You can add a request anytime from this project.';
      return;
    }
    const requestButton = event.target.closest('[data-request-more-designs]');
    if (!requestButton || !activeSession) return;
    const form = requestButton.closest('[data-design-feedback-form]');
    const project = requestButton.closest('[data-project-id]');
    await saveFeedback(form, {
      action: 'request_more',
      projectId: project.dataset.projectId,
      optionGroup: form.dataset.optionGroup,
      selectedOptionIds: [],
      revisionRound: Number(form.dataset.revisionRound || 0),
      notes: form.elements.notes.value.trim(),
    });
  };
  const onHostSubmit = async (event) => {
    const form = event.target.closest('form');
    if (!form || !activeSession) return;
    const project = form.closest('[data-project-id]');
    if (form.matches('[data-design-feedback-form]')) {
      event.preventDefault();
      const selectedOptionIds = [
        form.elements.firstChoice.value,
        form.elements.secondChoice.value,
        form.elements.thirdChoice.value,
      ].filter(Boolean);
      if (new Set(selectedOptionIds).size !== selectedOptionIds.length) {
        form.querySelector('.form-status').textContent = 'Choose each design only once.';
        return;
      }
      await saveFeedback(form, {
        action: 'select_designs',
        projectId: project.dataset.projectId,
        optionGroup: form.dataset.optionGroup,
        selectedOptionIds,
        revisionRound: Number(form.dataset.revisionRound || 0),
        notes: form.elements.notes.value.trim(),
      });
      return;
    }
    if (form.matches('[data-design-chooser-submit]')) {
      event.preventDefault();
      if (designChooser.rankedOptionIds.length !== 3) return;
      const saved = await saveFeedback(form, {
        action: 'select_designs',
        projectId: project.dataset.projectId,
        optionGroup: form.dataset.optionGroup,
        selectedOptionIds: designChooser.rankedOptionIds,
        revisionRound: Number(form.dataset.revisionRound || 0),
        notes: form.elements.notes.value.trim(),
      });
      if (saved) {
        designChooser = { open: false, rankedOptionIds: [], expandedOptionId: '' };
        renderCurrentWorkspace();
      }
      return;
    }
    if (form.matches('[data-special-request-form]')) {
      event.preventDefault();
      await saveFeedback(form, {
        action: 'special_request',
        projectId: project.dataset.projectId,
        selectedOptionIds: [],
        revisionRound: 0,
        notes: form.elements.notes.value.trim(),
      });
    }
  };

  const onPreviewError = (event) => {
    if (!event.target.matches?.('[data-signed-preview]') || hasRetriedBrokenPreview || disposed) return;
    hasRetriedBrokenPreview = true;
    void load();
  };

  const onHostKeydown = (event) => {
    if (event.key !== 'Escape' || !designChooser.open) return;
    designChooser = designChooser.expandedOptionId
      ? { ...designChooser, expandedOptionId: '' }
      : { open: false, rankedOptionIds: [], expandedOptionId: '' };
    renderCurrentWorkspace();
  };

  host.addEventListener('click', onHostClick);
  host.addEventListener('submit', onHostSubmit);
  host.addEventListener('error', onPreviewError, true);
  host.addEventListener('keydown', onHostKeydown);
  load();
  return () => {
    disposed = true;
    if (signedPreviewRefreshTimer) clearTimeout(signedPreviewRefreshTimer);
    host.removeEventListener('click', onHostClick);
    host.removeEventListener('submit', onHostSubmit);
    host.removeEventListener('error', onPreviewError, true);
    host.removeEventListener('keydown', onHostKeydown);
    document.body.classList.remove('has-design-chooser');
  };
}
