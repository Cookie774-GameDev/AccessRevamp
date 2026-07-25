const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const label = (value = '') => String(value)
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const planNames = {
  homepage_reveal: 'Homepage Reveal',
  complete_revamp: 'Complete Website Revamp',
  cinematic_scroll: 'Cinematic Scroll Site',
};

const money = (cents = 0, currency = 'USD') => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: String(currency || 'USD').toUpperCase(),
}).format(Number(cents || 0) / 100);

const projectTabs = [
  ['updates', 'Updates'],
  ['progress', 'Progress'],
  ['brief', 'Brief'],
  ['designs', 'Designs'],
  ['requests', 'Requests'],
  ['files', 'Files'],
];

function renderUpdates(project) {
  const updates = project.updates || [];
  if (!updates.length) return '<p class="portal-empty">No customer-facing updates have been published yet.</p>';
  return `<ol class="portal-timeline">${updates.map((update) => `<li><span class="portal-timeline__dot" aria-hidden="true"></span><div><strong>${escapeHtml(update.title)}</strong><p>${escapeHtml(update.body || '')}</p></div></li>`).join('')}</ol>`;
}

function renderProgress(project) {
  const tasks = project.workflow?.tasks || [];
  if (!tasks.length) return '<p class="portal-empty">Detailed production steps will appear here when the project is scheduled.</p>';
  return `<ol class="portal-task-list">${tasks.map((task) => `<li data-task-status="${escapeHtml(task.status)}"><span>${String(task.sequence_number || 0).padStart(2, '0')}</span><div><strong>${escapeHtml(label(task.task_key))}</strong><small>${escapeHtml(label(task.stage))}</small></div><span class="status-pill">${escapeHtml(label(task.status))}</span></li>`).join('')}</ol>`;
}

function renderBrief(project) {
  if (!project.brief) {
    const needsBrief = ['complete_revamp', 'cinematic_scroll'].includes(project.plan_key);
    return `<div class="portal-empty portal-empty--action"><p>${needsBrief ? 'Complete your project questions before production begins.' : 'No full website brief is required for this service.'}</p>${needsBrief ? `<a class="button button--small" href="/project-intake?plan=${encodeURIComponent(project.plan_key)}&project=${encodeURIComponent(project.id)}" data-nav>Complete project brief</a>` : ''}</div>`;
  }
  const brief = project.brief;
  return `<div class="portal-brief-grid"><div><span class="micro-label">Requested pages</span><p>${escapeHtml((brief.selected_pages || []).map(label).join(' · ') || 'Not specified')}</p></div><div><span class="micro-label">Style direction</span><p>${escapeHtml(brief.style_notes || 'Not specified')}</p></div><div><span class="micro-label">Content notes</span><p>${escapeHtml(brief.content_notes || 'Not specified')}</p></div><div><span class="micro-label">Additional requests</span><p>${escapeHtml(brief.project_notes || 'None')}</p></div></div>`;
}

function renderDesigns(project) {
  const options = project.design_options || [];
  if (!options.length) return '<p class="portal-empty">Design directions will appear here after human review.</p>';
  const choices = `<option value="">No selection</option>${options.map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(`${label(option.option_group)} option ${option.option_number}`)}</option>`).join('')}`;
  return `<div class="portal-design-grid">${options.map((option) => `<article class="portal-design-card"><div class="portal-design-card__preview">${option.preview_url ? `<img src="${escapeHtml(option.preview_url)}" alt="Design option ${Number(option.option_number)}" loading="lazy">` : '<span>Preview pending</span>'}</div><div><span class="micro-label">${escapeHtml(label(option.option_group))}</span><h4>Option ${Number(option.option_number)}</h4></div></article>`).join('')}</div><form class="portal-design-feedback" data-design-feedback-form data-option-group="${escapeHtml(options[0].option_group || 'homepage')}" data-revision-round="${Number(options[0].revision_round || 0)}"><div><h4>Rank your favorites</h4><p>Choose up to three directions.</p></div><label>First choice<select name="firstChoice" required>${choices}</select></label><label>Second choice<select name="secondChoice">${choices}</select></label><label>Third choice<select name="thirdChoice">${choices}</select></label><label class="portal-feedback-notes">Notes<textarea name="notes" maxlength="3000" rows="4"></textarea></label><div class="portal-feedback-actions"><button class="button button--small" type="submit">Save design choices</button><button class="button button--ghost button--small" type="button" data-request-more-designs>Request new directions</button><span class="form-status" role="status"></span></div></form>`;
}

function renderRequests(project) {
  const count = (project.feedback || []).filter((entry) => entry.action === 'special_request').length;
  return `<form class="portal-special-request" data-special-request-form><div><h4>Special request</h4><p>Send production-specific direction for this project.</p></div><label>Request<textarea name="notes" minlength="10" maxlength="3000" rows="5" required></textarea></label><div class="portal-feedback-actions"><button class="button button--small" type="submit">Send request</button><span class="form-status" role="status">${count ? `${count} recorded` : ''}</span></div></form>`;
}

function renderFiles(project) {
  const files = project.artifacts || [];
  const deliveries = project.deliveries || [];
  if (!files.length && !deliveries.length) return '<p class="portal-empty">No approved files are available yet.</p>';
  return `<div class="portal-file-grid">${files.map((file) => `<article class="portal-file-card"><div class="portal-file-card__body"><span class="micro-label">${escapeHtml(label(file.artifact_type))}</span><h4>${escapeHtml(file.metadata?.title || file.filename || 'Project file')}</h4>${file.download_url ? `<a class="button button--small" href="${escapeHtml(file.download_url)}" target="_blank" rel="noopener" download>Download</a>` : '<span class="status-pill">Link unavailable</span>'}</div></article>`).join('')}${deliveries.map((delivery) => `<article class="portal-file-card"><div class="portal-file-card__body"><span class="micro-label">Delivery</span><h4>${escapeHtml(label(delivery.delivery_type))}</h4>${delivery.drive_url ? `<a class="button button--small" href="${escapeHtml(delivery.drive_url)}" target="_blank" rel="noopener">Open delivery</a>` : ''}</div></article>`).join('')}</div>`;
}

function renderProject(project, activeProjectTab) {
  const progress = Math.max(0, Math.min(100, Number(project.progress_percent || 0)));
  const panels = {
    updates: renderUpdates(project),
    progress: renderProgress(project),
    brief: renderBrief(project),
    designs: renderDesigns(project),
    requests: renderRequests(project),
    files: renderFiles(project),
  };
  return `<article class="customer-project customer-workspace__canvas" data-project-id="${escapeHtml(project.id)}" tabindex="-1"><header class="customer-project__header"><div><span class="eyebrow">${escapeHtml(planNames[project.plan_key] || label(project.plan_key))}</span><h2>${escapeHtml(project.name || 'Your project')}</h2><p>${escapeHtml(project.scope_summary || 'Questions, designs, progress, and private files stay together here.')}</p></div><div class="customer-project__status"><span class="status-pill">${escapeHtml(label(project.status || 'pending'))}</span></div></header><div class="portal-progress"><div class="portal-progress__head"><strong>${progress}% complete</strong><span>${escapeHtml(label(project.workflow?.current_stage || project.status || 'pending'))}</span></div><div class="portal-progress__track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div></div><nav class="customer-project-tabs" aria-label="Project sections">${projectTabs.map(([key, text]) => `<button type="button" data-project-tab="${key}" aria-selected="${activeProjectTab === key}">${text}</button>`).join('')}</nav><div class="customer-project-panels">${projectTabs.map(([key, text]) => `<section data-project-panel="${key}"${activeProjectTab === key ? '' : ' hidden'}><h3 class="sr-only">${text}</h3>${panels[key]}</section>`).join('')}</div></article>`;
}

function renderRail(projects, selectedProjectId) {
  return `<nav class="customer-workspace__rail" aria-label="Your projects"><div class="customer-workspace__rail-head"><span class="micro-label">Projects</span><strong>${projects.length}</strong></div>${projects.map((project) => `<button type="button" data-project-select="${escapeHtml(project.id)}"${project.id === selectedProjectId ? ' aria-current="page"' : ''}><span>${escapeHtml(project.name || 'Untitled project')}</span><small>${escapeHtml(planNames[project.plan_key] || label(project.plan_key))}</small><i><b style="width:${Math.max(0, Math.min(100, Number(project.progress_percent || 0)))}%"></b></i></button>`).join('')}<a class="customer-workspace__new-project" href="/pricing" data-nav>Start another project</a></nav>`;
}

function renderOverview(result, selectedProject) {
  const entitlement = result.entitlement
    ? `${label(result.entitlement.highest_tier_key)} · ${label(result.entitlement.status)} · ${money(result.entitlement.effective_paid_cents)}`
    : 'No paid entitlement is linked yet.';
  return `<div class="customer-overview-grid"><section><span class="micro-label">Current entitlement</span><strong>${escapeHtml(entitlement)}</strong></section><section><span class="micro-label">Projects</span><strong>${(result.projects || []).length}</strong></section><section><span class="micro-label">Next project</span><strong>${escapeHtml(selectedProject?.name || 'Start a new project')}</strong></section></div><button class="button button--ghost button--small" type="button" data-hub-refresh>Refresh dashboard</button>`;
}

function renderSettings(result) {
  const profile = result.profile || {};
  const email = String(profile.email || '');
  return `<section class="customer-settings"><div><span class="micro-label">Account</span><h2>Settings</h2><p>Your private project workspace stays tied to this confirmed email.</p></div><dl><div><dt>Name</dt><dd>${escapeHtml(profile.full_name || 'Not provided')}</dd></div><div><dt>Email</dt><dd>${escapeHtml(email || 'Confirmed account email')}</dd></div></dl><a class="button button--small" href="/forgot-password?email=${encodeURIComponent(email)}" data-nav>Change password with a verification code</a><p class="customer-settings__note">For security, password changes require a new code sent to your confirmed email.</p></section>`;
}

export function renderWorkspace(result, selectedProjectId = '', activeWorkspaceTab = 'projects', activeProjectTab = 'updates') {
  const projects = result.projects || [];
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0] || null;
  const tabs = [['overview', 'Overview'], ['projects', 'Projects'], ['settings', 'Settings']];
  const projectView = selectedProject
    ? `<div class="customer-workspace">${renderRail(projects, selectedProject.id)}${renderProject(selectedProject, activeProjectTab)}</div>`
    : '<div class="empty-state"><h2>No project yet</h2><p>A verified payment creates your private project automatically.</p><a class="button" href="/pricing" data-nav>Review service options</a></div>';
  const panels = {
    overview: renderOverview(result, selectedProject),
    projects: projectView,
    settings: renderSettings(result),
  };
  return `<nav class="customer-dashboard-tabs" aria-label="Dashboard">${tabs.map(([key, text]) => `<button type="button" data-workspace-tab="${key}" aria-selected="${activeWorkspaceTab === key}">${text}</button>`).join('')}</nav>${tabs.map(([key]) => `<div class="customer-dashboard-panel" data-workspace-panel="${key}"${activeWorkspaceTab === key ? '' : ' hidden'}>${panels[key]}</div>`).join('')}`;
}
