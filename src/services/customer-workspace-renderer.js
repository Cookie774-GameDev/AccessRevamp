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
  return `<section class="website-review__posters"><div><span class="micro-label">Animated poster previews</span><h4>Private motion posters</h4><p>Review each vertical loop at full size. The expiring links stay inside this account workspace.</p></div><div class="portal-design-grid">${options.map((option) => `<article class="portal-design-card portal-design-card--poster"><div class="portal-design-card__preview">${option.preview_url ? `<video data-signed-preview src="${escapeHtml(option.preview_url)}" aria-label="Animated poster option ${Number(option.option_number)}" loop muted playsinline controls preload="metadata"></video>` : '<span>Preview pending</span>'}</div><div><span class="micro-label">Poster option ${Number(option.option_number)}</span><h4>Motion poster ${Number(option.option_number)}</h4><p class="portal-design-card__summary">${escapeHtml(option.prompt_summary || 'Private animated poster concept')}</p>${option.preview_url ? `<a class="button button--small" href="${escapeHtml(option.preview_url)}" target="_blank" rel="noopener">Open full preview</a>` : '<span class="status-pill">Link pending</span>'}</div></article>`).join('')}</div></section>`;
}

function renderSpecialRequestStep(project) {
  const requestCount = (project.feedback || []).filter((entry) => entry.action === 'special_request').length;
  return `<form class="portal-special-request website-review__request" data-special-request-form><div><span class="micro-label">Step 2 of 2</span><h4>Any special requests?</h4><p>Optional. Tell us what to combine, avoid, or explore next. Your note stays with this project only.</p></div><label>Special request<textarea name="notes" minlength="10" maxlength="3000" rows="5" placeholder="Optional: share a detail or direction for the next round."></textarea></label><div class="portal-feedback-actions"><button class="button button--small" type="submit">Send request</button><button class="button button--ghost button--small" type="button" data-website-finish>Finish for now</button><span class="form-status" role="status">${requestCount ? `${requestCount} request${requestCount === 1 ? '' : 's'} recorded` : ''}</span></div></form>`;
}

function renderDesignChooser(options, optionGroup, revisionRound, state = {}) {
  if (!state.open) return '';
  const rankedOptionIds = (state.rankedOptionIds || []).filter((id) => options.some((option) => option.id === id)).slice(0, 3);
  const rankIndex = rankedOptionIds.length;
  const rankNames = ['First choice', 'Second choice', 'Third choice'];
  const availableOptions = options.filter((option) => !rankedOptionIds.includes(option.id));
  const selectedOptions = rankedOptionIds.map((id) => options.find((option) => option.id === id)).filter(Boolean);
  const stepLabels = ['1 Favorite', '2 Second', '3 Third', '4 Instructions'];
  const progress = `<ol class="design-chooser__progress" aria-label="Design selection progress">${stepLabels.map((text, index) => `<li${index === Math.min(rankIndex, 3) ? ' aria-current="step"' : ''}${index < rankIndex ? ' data-complete' : ''}>${text}</li>`).join('')}</ol>`;
  const selectedSummary = selectedOptions.length
    ? `<ol class="design-chooser__selected">${selectedOptions.map((option, index) => `<li><span>${rankNames[index]}</span><strong>Direction ${Number(option.option_number)}</strong></li>`).join('')}</ol>`
    : '';

  if (rankIndex < 3) {
    const choiceName = rankNames[rankIndex];
    return `<section class="design-chooser" data-design-chooser role="dialog" aria-modal="true" aria-labelledby="design-chooser-title"><div class="design-chooser__frame"><header class="design-chooser__head"><div><span class="micro-label">Website direction</span><p>${rankIndex + 1} of 4</p></div><button class="design-chooser__close" type="button" data-design-chooser-close aria-label="Close design chooser">×</button></header>${progress}<main class="design-chooser__body"><div class="design-chooser__intro"><span class="micro-label">Make your pick</span><h2 id="design-chooser-title">Pick your ${choiceName}</h2><p>${rankIndex === 0 ? 'Choose the homepage direction that should lead the build.' : 'Choose the next-strongest direction. Already ranked choices stay locked in.'}</p></div>${selectedSummary}<div class="design-chooser__cards">${availableOptions.map((option) => `<button class="design-chooser__card" type="button" data-design-rank-option="${escapeHtml(option.id)}"><span class="design-chooser__card-media">${option.preview_url ? `<img data-signed-preview src="${escapeHtml(option.preview_url)}" alt="Homepage direction ${Number(option.option_number)}" loading="eager">` : '<span>Preview pending</span>'}</span><span><small>Direction ${Number(option.option_number)}</small><strong>${escapeHtml(option.prompt_summary || 'Homepage concept')}</strong></span></button>`).join('')}</div></main></div></section>`;
  }

  return `<section class="design-chooser" data-design-chooser role="dialog" aria-modal="true" aria-labelledby="design-chooser-title"><div class="design-chooser__frame"><header class="design-chooser__head"><div><span class="micro-label">Website direction</span><p>4 of 4</p></div><button class="design-chooser__close" type="button" data-design-chooser-close aria-label="Close design chooser">×</button></header>${progress}<main class="design-chooser__body"><div class="design-chooser__intro"><span class="micro-label">Almost there</span><h2 id="design-chooser-title">Any special instructions?</h2><p>Optional. Tell us what to combine, avoid, or make more prominent before the next design round.</p></div>${selectedSummary}<form class="design-chooser__instructions" data-design-chooser-submit data-option-group="${escapeHtml(optionGroup)}" data-revision-round="${Number(revisionRound || 0)}"><label>Special instructions<textarea name="notes" maxlength="3000" rows="6" placeholder="Optional: describe the details you want us to keep, change, or explore."></textarea></label><div><button class="button button--ghost" type="button" data-design-chooser-back>Back</button><button class="button" type="submit">Submit selections</button><span class="form-status" role="status"></span></div></form></main></div></section>`;
}

function renderDesignChooserV2(options, optionGroup, revisionRound, state = {}) {
  if (!state.open) return '';
  const rankedOptionIds = (state.rankedOptionIds || [])
    .filter((id) => options.some((option) => option.id === id))
    .slice(0, 3);
  const rankIndex = rankedOptionIds.length;
  const rankNames = ['First choice', 'Second choice', 'Third choice'];
  const choiceNames = ['favorite', 'second favorite', 'third favorite'];
  const selectedOptions = rankedOptionIds
    .map((id) => options.find((option) => option.id === id))
    .filter(Boolean);
  const availableOptions = options.filter((option) => !rankedOptionIds.includes(option.id));
  const expandedOption = options.find((option) => option.id === state.expandedOptionId);
  const stepLabels = ['1 Favorite', '2 Second', '3 Third', '4 Instructions'];
  const progress = `<ol class="design-chooser__progress" aria-label="Design selection progress">${stepLabels.map((text, index) => `<li${index === Math.min(rankIndex, 3) ? ' aria-current="step"' : ''}${index < rankIndex ? ' data-complete' : ''}>${text}</li>`).join('')}</ol>`;
  const selectedSummary = selectedOptions.length
    ? `<ol class="design-chooser__selected">${selectedOptions.map((option, index) => `<li><span>${rankNames[index]}</span><strong>Direction ${Number(option.option_number)}</strong></li>`).join('')}</ol>`
    : '';
  const expandedPreview = expandedOption
    ? `<section class="design-preview-overlay" data-design-preview-overlay role="dialog" aria-modal="true" aria-label="Enlarged homepage direction ${Number(expandedOption.option_number)}"><header><div><span class="micro-label">Enlarged preview</span><strong>Direction ${Number(expandedOption.option_number)}</strong></div><button type="button" data-design-preview-close aria-label="Close enlarged preview">&times;</button></header><div>${expandedOption.preview_url ? `<img data-signed-preview src="${escapeHtml(expandedOption.preview_url)}" alt="Enlarged homepage direction ${Number(expandedOption.option_number)}">` : '<span>Preview pending</span>'}</div></section>`
    : '';

  if (rankIndex < 3) {
    const choiceName = choiceNames[rankIndex];
    const back = rankIndex > 0
      ? '<div class="design-chooser__step-actions"><button class="button button--ghost" type="button" data-design-chooser-back>Back to the last choice</button></div>'
      : '';
    const cards = availableOptions.map((option) => `<article class="design-chooser__card"><div class="design-chooser__card-media">${option.preview_url ? `<img data-signed-preview src="${escapeHtml(option.preview_url)}" alt="Homepage direction ${Number(option.option_number)}" loading="eager">` : '<span>Preview pending</span>'}<button class="design-chooser__enlarge" type="button" data-design-preview-open="${escapeHtml(option.id)}">Enlarge preview</button></div><div class="design-chooser__card-copy"><small>Direction ${Number(option.option_number)}</small><strong>${escapeHtml(option.prompt_summary || 'Homepage concept')}</strong><button class="button" type="button" data-design-rank-option="${escapeHtml(option.id)}">Choose as ${choiceName}</button></div></article>`).join('');
    return `<section class="design-chooser" data-design-chooser role="dialog" aria-modal="true" aria-labelledby="design-chooser-title"><div class="design-chooser__frame"><header class="design-chooser__head"><div><span class="micro-label">Website direction</span><p>${rankIndex + 1} of 4</p></div><button class="design-chooser__close" type="button" data-design-chooser-close aria-label="Close design chooser">&times;</button></header>${progress}<main class="design-chooser__body"><div class="design-chooser__intro"><span class="micro-label">Make your pick</span><h2 id="design-chooser-title">Pick your ${choiceName}</h2><p>${rankIndex === 0 ? 'Inspect each full homepage, then choose the direction that should lead the build.' : 'Choose the next-strongest direction. Your earlier choices stay visible below.'}</p></div>${selectedSummary}${back}<div class="design-chooser__cards">${cards}</div></main></div>${expandedPreview}</section>`;
  }

  const reviewGrid = `<ol class="design-chooser__review-grid">${selectedOptions.map((option, index) => `<li><span>${rankNames[index]}</span><div>${option.preview_url ? `<img data-signed-preview src="${escapeHtml(option.preview_url)}" alt="${rankNames[index]}: homepage direction ${Number(option.option_number)}">` : '<span>Preview pending</span>'}</div><strong>Direction ${Number(option.option_number)}</strong><button type="button" data-design-preview-open="${escapeHtml(option.id)}">Enlarge preview</button></li>`).join('')}</ol>`;
  return `<section class="design-chooser" data-design-chooser role="dialog" aria-modal="true" aria-labelledby="design-chooser-title"><div class="design-chooser__frame"><header class="design-chooser__head"><div><span class="micro-label">Website direction</span><p>4 of 4</p></div><button class="design-chooser__close" type="button" data-design-chooser-close aria-label="Close design chooser">&times;</button></header>${progress}<main class="design-chooser__body"><div class="design-chooser__intro"><span class="micro-label">Review your ranking</span><h2 id="design-chooser-title">Confirm your top three</h2><p>Check the order below, then add optional instructions for what to keep, combine, or avoid.</p></div>${reviewGrid}<form class="design-chooser__instructions" data-design-chooser-submit data-option-group="${escapeHtml(optionGroup)}" data-revision-round="${Number(revisionRound || 0)}"><label>Special instructions<textarea name="notes" maxlength="3000" rows="6" placeholder="Optional: describe the details you want us to keep, change, or explore."></textarea></label><div><button class="button button--ghost" type="button" data-design-chooser-back>Back to ranking</button><button class="button" type="submit">Submit selections</button><span class="form-status" role="status"></span></div></form></main></div>${expandedPreview}</section>`;
}

function renderWebsite(project, chooserState = {}) {
  const allOptions = project.design_options || [];
  const homepageOptions = allOptions.filter((option) => String(option.option_group || '').startsWith('homepage_'));
  const posterOptions = allOptions.filter((option) => option.option_group === 'poster_animated');
  if (!homepageOptions.length) {
    return `${renderPosterOptions(posterOptions)}<p class="portal-empty">Website directions will appear here after human review.</p>`;
  }
  const latestRound = Math.max(...homepageOptions.map((option) => Number(option.revision_round || 0)));
  const options = homepageOptions.filter((option) => Number(option.revision_round || 0) === latestRound);
  const optionGroup = 'homepage';
  return `<div class="website-review"><header class="website-review__hero"><span class="eyebrow">Action ready</span><h3>Your homepage directions are ready.</h3><p>Open the full-screen review, enlarge each concept, rank your top three, and send one clear decision to the team.</p><button class="button website-review__start" type="button" data-open-design-chooser><span>Choose website design</span><small>Start the guided design review</small></button></header>${renderPosterOptions(posterOptions)}${renderDesignChooserV2(options, optionGroup, latestRound, chooserState)}</div>`;
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

const auditGroupMeta = {
  conversion: ['Conversion path', 'M4 4h16v16H4zM8 16l3-3 2 2 3-4'],
  usability: ['Ease of use', 'M12 3a9 9 0 1 0 9 9M8 12h8M12 8v8'],
  content: ['Claims and content', 'M6 3h9l3 3v15H6zM9 11h6M9 15h6'],
  seo: ['Search visibility', 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 5 5'],
  performance: ['Speed and performance', 'M4 14a8 8 0 1 1 16 0M12 14l4-4'],
  passive_security: ['Passive security', 'M12 3l8 3v6c0 5-3 8-8 10-5-2-8-5-8-10V6z'],
};

function renderAuditMark(group) {
  const [name, path] = auditGroupMeta[group] || [label(group), 'M4 12h16M12 4v16'];
  return `<span class="portal-insight-group__mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="${path}"/></svg></span><span>${escapeHtml(name)}</span>`;
}

function renderInsightsV2(project) {
  const findings = project.findings || [];
  if (!findings.length) return '<p class="portal-empty">Verified website findings will appear here after review.</p>';
  const groups = new Map();
  findings.forEach((finding) => {
    const key = finding.audit_type || 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(finding);
  });
  const sections = [...groups].map(([group, entries]) => `<section><header><div>${renderAuditMark(group)}</div><strong>${entries.length}</strong></header><div>${entries.map((finding) => `<article class="portal-insight-card" data-severity="${escapeHtml(finding.severity)}"><div class="portal-insight-card__head"><span>${escapeHtml(label(finding.severity))}</span><small>${escapeHtml(label(finding.confidence))} confidence</small></div><h4>${escapeHtml(finding.title)}</h4><p>${escapeHtml(finding.summary)}</p><dl><div><dt>Evidence: what we found</dt><dd>${escapeHtml(finding.evidence)}</dd></div><div><dt>Recommended move: what to do next</dt><dd>${escapeHtml(finding.remediation)}</dd></div></dl>${finding.source_url ? `<a class="portal-insight-card__source" href="${escapeHtml(finding.source_url)}" target="_blank" rel="noopener"><span>Open cited page</span><strong>${escapeHtml(finding.source_title || finding.source_url)}</strong></a>` : ''}</article>`).join('')}</div></section>`).join('');
  return `<div class="portal-insight-summary"><div><span class="micro-label">Website evaluation</span><h4>${findings.length} verified ${findings.length === 1 ? 'opportunity' : 'opportunities'}</h4></div><p>What we observed, why it matters, and the next practical move. Every linked finding opens the exact page or official guidance used as evidence.</p></div><div class="portal-insight-groups">${sections}</div>`;
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

const milestoneSets = {
  homepage_reveal: [
    ['intake_pending', 'Intake'],
    ['reviewing', 'Audit'],
    ['concept', 'Directions'],
    ['client_review', 'Client review'],
    ['completed', 'Complete'],
  ],
  website: [
    ['intake_pending', 'Intake'],
    ['reviewing', 'Audit'],
    ['concept', 'Directions'],
    ['client_review', 'Client review'],
    ['implementation', 'Website build'],
    ['completed', 'Delivery'],
  ],
};

function resolveMilestoneStage(project, progress) {
  const raw = String(project.workflow?.current_stage || project.status || '').toLowerCase();
  if (['completed', 'delivery'].includes(raw)) return 'completed';
  if (['implementation', 'specification', 'cinematic_design', 'cinematic_generation', 'creative_pack', 'quality_review'].includes(raw)) return 'implementation';
  if (['client_review', 'customer_approval', 'revision'].includes(raw)) return 'client_review';
  if (['concept', 'design'].includes(raw)) return 'concept';
  if (['reviewing', 'audit', 'strategy'].includes(raw)) return 'reviewing';
  if (['intake_pending', 'payment_reconciliation', 'customer_setup', 'research'].includes(raw)) return 'intake_pending';
  if (progress >= 100) return 'completed';
  if (progress >= 85) return 'implementation';
  if (progress >= 65) return 'client_review';
  if (progress >= 40) return 'concept';
  if (progress >= 20) return 'reviewing';
  return 'intake_pending';
}

function renderMilestoneProgress(project, progress) {
  const milestones = project.plan_key === 'homepage_reveal' ? milestoneSets.homepage_reveal : milestoneSets.website;
  const currentStage = resolveMilestoneStage(project, progress);
  const currentIndex = Math.max(0, milestones.findIndex(([key]) => key === currentStage));
  return `<section class="portal-progress" aria-label="Project progress"><div class="portal-progress__head"><div><span class="micro-label">Current checkpoint</span><strong>${escapeHtml(milestones[currentIndex][1])}</strong></div><span>${progress}% complete</span></div><div class="portal-progress__track" role="progressbar" aria-label="Project progress" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div><ol class="portal-progress__milestones">${milestones.map(([key, text], index) => `<li data-progress-milestone="${key}"${index === currentIndex ? ' aria-current="step"' : ''}${index < currentIndex ? ' data-complete' : ''}><i aria-hidden="true"></i><span>${escapeHtml(text)}</span></li>`).join('')}</ol></section>`;
}

function renderProject(project, activeProjectTab, workspaceUi) {
  const statusFloor = {
    intake_pending: 10,
    reviewing: 25,
    concept: 55,
    client_review: 85,
    implementation: 90,
    completed: 100,
  };
  const progress = Math.max(
    0,
    Math.min(100, Math.max(Number(project.progress_percent || 0), statusFloor[project.status] || 0)),
  );
  const chooserState = workspaceUi.designChooser || {
    open: Boolean(workspaceUi.designChooserOpen),
    rankedOptionIds: workspaceUi.rankedOptionIds || [],
  };
  const panels = {
    audit: renderInsightsV2(project),
    website: renderWebsite(project, chooserState),
  };
  const projectKind = project.order_id ? (planNames[project.plan_key] || label(project.plan_key)) : 'Private evaluation test';
  return `<article class="customer-project customer-workspace__canvas" data-project-id="${escapeHtml(project.id)}" tabindex="-1"><header class="customer-project__header"><div><span class="eyebrow">${escapeHtml(projectKind)}</span><h2>${escapeHtml(project.name || 'Your project')}</h2><p>${escapeHtml(project.scope_summary || 'Questions, designs, progress, and private files stay together here.')}</p></div><div class="customer-project__status"><span class="status-pill">${escapeHtml(label(project.status || 'pending'))}</span>${project.order_id ? '' : '<span class="status-pill status-pill--secondary">No payment attached</span>'}</div></header>${renderMilestoneProgress(project, progress)}<nav class="customer-project-tabs" aria-label="Project sections">${projectTabs.map(([key, text]) => `<button type="button" data-project-tab="${key}" aria-selected="${activeProjectTab === key}">${text}</button>`).join('')}</nav><div class="customer-project-panels">${projectTabs.map(([key, text]) => `<section data-project-panel="${key}"${activeProjectTab === key ? '' : ' hidden'}><h3 class="sr-only">${text}</h3>${panels[key]}</section>`).join('')}</div></article>`;
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

export function renderWorkspace(result, selectedProjectId = '', activeWorkspaceTab = 'projects', activeProjectTab = '', workspaceUi = {}) {
  const projects = result.projects || [];
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0] || null;
  const selectedProjectTab = selectedProject ? resolveProjectTab(selectedProject, activeProjectTab) : 'audit';
  const tabs = [['projects', 'Projects'], ['settings', 'Settings']];
  const projectView = selectedProject
    ? `<div class="customer-workspace">${renderRail(projects, selectedProject.id)}${renderProject(selectedProject, selectedProjectTab, workspaceUi)}</div>`
    : '<div class="empty-state"><h2>No project yet</h2><p>A verified payment creates your private project automatically.</p><a class="button" href="/pricing" data-nav>Review service options</a></div>';
  const panels = {
    projects: projectView,
    settings: renderSettings(result),
  };
  return `<nav class="customer-dashboard-tabs" aria-label="Dashboard">${tabs.map(([key, text]) => `<button type="button" data-workspace-tab="${key}" aria-selected="${activeWorkspaceTab === key}">${text}</button>`).join('')}</nav>${tabs.map(([key]) => `<div class="customer-dashboard-panel" data-workspace-panel="${key}"${activeWorkspaceTab === key ? '' : ' hidden'}>${panels[key]}</div>`).join('')}`;
}
