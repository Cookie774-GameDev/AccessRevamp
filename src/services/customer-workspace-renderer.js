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
  ['audit', 'Audit'],
  ['website', 'Website'],
];

function resolveProjectTab(project, requestedTab = '') {
  if (projectTabs.some(([key]) => key === requestedTab)) return requestedTab;
  return (project.design_options || []).length ? 'website' : 'audit';
}

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

function renderPosterOptions(options) {
  if (!options.length) return '';
  return `<section class="website-review__posters"><div><span class="micro-label">Animated poster previews</span><h4>Two private motion posters are ready for review.</h4><p>Each vertical video is delivered through an expiring project link and remains inside this account workspace.</p></div><div class="portal-design-grid">${options.map((option) => `<article class="portal-design-card portal-design-card--poster"><div class="portal-design-card__preview">${option.preview_url ? `<video src="${escapeHtml(option.preview_url)}" aria-label="Animated poster option ${Number(option.option_number)}" loop muted playsinline controls preload="metadata"></video>` : '<span>Preview pending</span>'}</div><div><span class="micro-label">Poster option ${Number(option.option_number)}</span><h4>${escapeHtml(option.prompt_summary || 'Motion poster concept')}</h4>${option.preview_url ? `<a class="button button--small" href="${escapeHtml(option.preview_url)}" target="_blank" rel="noopener">Open motion poster</a>` : '<span class="status-pill">Link pending</span>'}</div></article>`).join('')}</div></section>`;
}

function renderSpecialRequestStep(project) {
  const requestCount = (project.feedback || []).filter((entry) => entry.action === 'special_request').length;
  return `<form class="portal-special-request website-review__request" data-special-request-form><div><span class="micro-label">Step 2 of 2</span><h4>Any special requests?</h4><p>Optional. Tell us what to combine, avoid, or explore next. Your note stays with this project only.</p></div><label>Special request<textarea name="notes" minlength="10" maxlength="3000" rows="5" placeholder="Optional: share a detail or direction for the next round."></textarea></label><div class="portal-feedback-actions"><button class="button button--small" type="submit">Send request</button><button class="button button--ghost button--small" type="button" data-website-finish>Finish for now</button><span class="form-status" role="status">${requestCount ? `${requestCount} request${requestCount === 1 ? '' : 's'} recorded` : ''}</span></div></form>`;
}

function renderWebsite(project) {
  const allOptions = project.design_options || [];
  const homepageOptions = allOptions.filter((option) => String(option.option_group || '').startsWith('homepage_'));
  const posterOptions = allOptions.filter((option) => option.option_group === 'poster_animated');
  if (!homepageOptions.length) return '<p class="portal-empty">Website directions will appear here after human review.</p>';
  const latestRound = Math.max(...homepageOptions.map((option) => Number(option.revision_round || 0)));
  const options = homepageOptions.filter((option) => Number(option.revision_round || 0) === latestRound);
  const optionGroup = options[0]?.option_group || 'homepage_normal';
  const hasSavedRanking = (project.feedback || []).some((entry) => entry.action === 'select_designs'
    && entry.option_group === optionGroup
    && Number(entry.revision_round || 0) === latestRound);
  const choices = `<option value="">No selection</option>${options.map((option) => `<option value="${escapeHtml(option.id)}">Homepage option ${Number(option.option_number)}</option>`).join('')}`;
  const picker = `<form class="portal-design-feedback website-review__picker" data-design-feedback-form data-website-review-form data-option-group="${escapeHtml(optionGroup)}" data-revision-round="${latestRound}"><div><span class="micro-label">Step 1 of 2</span><h4>Pick your favorite homepage directions.</h4><p>Rank up to three. Your first choice becomes the lead reference for the next round.</p></div><label>First choice<select name="firstChoice" required>${choices}</select></label><label>Second choice<select name="secondChoice">${choices}</select></label><label>Third choice<select name="thirdChoice">${choices}</select></label><label class="portal-feedback-notes">What stood out?<textarea name="notes" maxlength="3000" rows="4" placeholder="Optional: tell us what you want to keep or avoid."></textarea></label><div class="portal-feedback-actions"><button class="button button--small" type="submit">Continue to special requests</button><span class="form-status" role="status"></span></div></form>`;
  return `<div class="website-review"><header class="website-review__hero"><span class="eyebrow">Website direction</span><h3>Pick the visual direction that feels most like your brand.</h3><p>Review each homepage below, rank your top three, then add an optional special request.</p></header>${renderPosterOptions(posterOptions)}<div class="portal-design-grid website-review__grid">${options.map((option) => `<article class="portal-design-card"><div class="portal-design-card__preview">${option.preview_url ? `<img src="${escapeHtml(option.preview_url)}" alt="Homepage option ${Number(option.option_number)}" loading="lazy">` : '<span>Preview pending</span>'}</div><div><span class="micro-label">Homepage option ${Number(option.option_number)}</span><h4>Direction ${Number(option.option_number)}</h4>${option.prompt_summary ? `<p>${escapeHtml(option.prompt_summary)}</p>` : ''}</div></article>`).join('')}</div>${hasSavedRanking ? renderSpecialRequestStep(project) : picker}</div>`;
}

function renderInsights(project) {
  const findings = project.findings || [];
  if (!findings.length) return '<p class="portal-empty">Verified website findings will appear here after review.</p>';
  const groups = new Map();
  findings.forEach((finding) => {
    const key = finding.audit_type || 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(finding);
  });
  return `<div class="portal-insight-summary"><div><span class="micro-label">Website evaluation</span><h4>${findings.length} verified opportunities</h4></div><p>Prioritized observations from the public storefront and current platform guidance. Recommendations do not guarantee rankings or sales.</p></div><div class="portal-insight-groups">${[...groups].map(([group, entries]) => `<section><header><span>${escapeHtml(label(group))}</span><strong>${entries.length}</strong></header><div>${entries.map((finding) => `<article class="portal-insight-card" data-severity="${escapeHtml(finding.severity)}"><div class="portal-insight-card__head"><span>${escapeHtml(label(finding.severity))}</span><small>${escapeHtml(label(finding.confidence))} confidence</small></div><h4>${escapeHtml(finding.title)}</h4><p>${escapeHtml(finding.summary)}</p><dl><div><dt>Evidence</dt><dd>${escapeHtml(finding.evidence)}</dd></div><div><dt>Recommended move</dt><dd>${escapeHtml(finding.remediation)}</dd></div></dl>${finding.source_url ? `<a href="${escapeHtml(finding.source_url)}" target="_blank" rel="noopener">Review source ↗</a>` : ''}</article>`).join('')}</div></section>`).join('')}</div>`;
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
    audit: renderInsights(project),
    website: renderWebsite(project),
  };
  const projectKind = project.order_id ? (planNames[project.plan_key] || label(project.plan_key)) : 'Private evaluation test';
  return `<article class="customer-project customer-workspace__canvas" data-project-id="${escapeHtml(project.id)}" tabindex="-1"><header class="customer-project__header"><div><span class="eyebrow">${escapeHtml(projectKind)}</span><h2>${escapeHtml(project.name || 'Your project')}</h2><p>${escapeHtml(project.scope_summary || 'Questions, designs, progress, and private files stay together here.')}</p></div><div class="customer-project__status"><span class="status-pill">${escapeHtml(label(project.status || 'pending'))}</span>${project.order_id ? '' : '<span class="status-pill status-pill--secondary">No payment attached</span>'}</div></header><div class="portal-progress"><div class="portal-progress__head"><strong>${progress}% complete</strong><span>${escapeHtml(label(project.workflow?.current_stage || project.status || 'pending'))}</span></div><div class="portal-progress__track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div></div><nav class="customer-project-tabs" aria-label="Project sections">${projectTabs.map(([key, text]) => `<button type="button" data-project-tab="${key}" aria-selected="${activeProjectTab === key}">${text}</button>`).join('')}</nav><div class="customer-project-panels">${projectTabs.map(([key, text]) => `<section data-project-panel="${key}"${activeProjectTab === key ? '' : ' hidden'}><h3 class="sr-only">${text}</h3>${panels[key]}</section>`).join('')}</div></article>`;
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
  return `<section class="customer-settings"><div><span class="micro-label">Account</span><h2>Settings</h2><p>Your private project workspace stays tied to this confirmed email.</p></div><dl><div><dt>Name</dt><dd>${escapeHtml(profile.full_name || 'Not provided')}</dd></div><div><dt>Email</dt><dd>${escapeHtml(email || 'Confirmed account email')}</dd></div></dl><div class="customer-settings__actions"><a class="button button--small" href="/forgot-password?email=${encodeURIComponent(email)}" data-nav>Change password with a verification code</a><button class="button button--ghost button--small" type="button" data-settings-signout>Sign out</button></div><p class="customer-settings__note">For security, password changes require a new code sent to your confirmed email.</p><div class="customer-signout-confirm" data-signout-confirm hidden role="group" aria-label="Confirm sign out"><div><strong>Sign out of this device?</strong><p>Your saved projects stay private and unchanged.</p></div><div><button class="button button--ghost button--small" type="button" data-signout-cancel>Cancel</button><button class="button button--small" type="button" data-signout-approve>Yes, sign out</button></div></div></section>`;
}

export function renderWorkspace(result, selectedProjectId = '', activeWorkspaceTab = 'projects', activeProjectTab = '') {
  const projects = result.projects || [];
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0] || null;
  const selectedProjectTab = selectedProject ? resolveProjectTab(selectedProject, activeProjectTab) : 'audit';
  const tabs = [['overview', 'Overview'], ['projects', 'Projects'], ['settings', 'Settings']];
  const projectView = selectedProject
    ? `<div class="customer-workspace">${renderRail(projects, selectedProject.id)}${renderProject(selectedProject, selectedProjectTab)}</div>`
    : '<div class="empty-state"><h2>No project yet</h2><p>A verified payment creates your private project automatically.</p><a class="button" href="/pricing" data-nav>Review service options</a></div>';
  const panels = {
    overview: renderOverview(result, selectedProject),
    projects: projectView,
    settings: renderSettings(result),
  };
  return `<nav class="customer-dashboard-tabs" aria-label="Dashboard">${tabs.map(([key, text]) => `<button type="button" data-workspace-tab="${key}" aria-selected="${activeWorkspaceTab === key}">${text}</button>`).join('')}</nav>${tabs.map(([key]) => `<div class="customer-dashboard-panel" data-workspace-panel="${key}"${activeWorkspaceTab === key ? '' : ' hidden'}>${panels[key]}</div>`).join('')}`;
}
