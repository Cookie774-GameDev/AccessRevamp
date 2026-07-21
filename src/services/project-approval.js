import { escapeHtml } from '../components/icons.js';

const purposeLabels = Object.freeze({
  homepage_selection: 'Homepage direction',
  revision_selection: 'Revision direction',
  cinematic_sequence_selection: 'Cinematic sequence',
  scene_selection: 'Scene direction',
  final_approval: 'Final approval',
  portfolio_consent: 'Portfolio permission',
});

const planLabels = Object.freeze({
  homepage_reveal: 'Homepage Reveal',
  complete_revamp: 'Complete Website Revamp',
  cinematic_scroll: 'Cinematic Scroll Site',
});

async function responseJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The approval request could not be completed.');
  return body;
}

export function setupProjectApproval(root = document) {
  const container = root.querySelector('[data-project-approval]');
  if (!container) return undefined;
  const token = container.dataset.approvalToken || '';
  const summary = container.querySelector('[data-approval-summary]');
  const form = container.querySelector('[data-approval-form]');
  const fieldset = container.querySelector('[data-approval-options]');
  const grid = container.querySelector('[data-approval-option-grid]');
  const status = container.querySelector('[data-approval-status]');
  const submit = form.querySelector('button[type="submit"]');
  const controller = new AbortController();
  let approval;

  const renderOptions = (options) => {
    grid.innerHTML = options.map((option) => {
      const label = option.sequenceKey
        ? `Sequence ${escapeHtml(option.sequenceKey)}`
        : `Option ${escapeHtml(String(option.optionNumber))}`;
      const scene = option.sceneNumber ? ` · Scene ${escapeHtml(String(option.sceneNumber))}` : '';
      const image = option.imageUrl
        ? `<img class="approval-option__image" src="${escapeHtml(option.imageUrl)}" alt="${label}${scene} preview" loading="lazy" decoding="async">`
        : '<span class="approval-option__placeholder">Preview is being prepared.</span>';
      return `<label class="order-plan approval-option"><input type="radio" name="selectedOption" value="${escapeHtml(option.id)}" required><span>${image}<b>${label}${scene}</b><small>${escapeHtml(option.promptSummary || 'Review this direction carefully before confirming.')}</small></span></label>`;
    }).join('');
  };

  const load = async () => {
    try {
      const data = await responseJson(await fetch(`/api/project-approval?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: controller.signal,
        credentials: 'same-origin',
      }));
      approval = data;
      const project = data.project;
      const scene = project.cinematicSceneCount ? `<div><dt>Cinematic scope</dt><dd>${escapeHtml(String(project.cinematicSceneCount))} scenes</dd></div>` : '';
      summary.innerHTML = `<dl><div><dt>Project</dt><dd>${escapeHtml(project.name)}</dd></div><div><dt>Plan</dt><dd>${escapeHtml(planLabels[project.planKey] || project.planKey)}</dd></div><div><dt>Approval</dt><dd>${escapeHtml(purposeLabels[data.purpose] || data.purpose)}</dd></div>${scene}<div><dt>Link expires</dt><dd>${escapeHtml(new Date(data.expiresAt).toLocaleString())}</dd></div></dl>`;
      if (data.options.length) renderOptions(data.options);
      else fieldset.hidden = true;
      form.hidden = false;
      status.textContent = 'Review the project and submit one confirmed choice.';
    } catch (error) {
      if (error.name === 'AbortError') return;
      summary.innerHTML = `<p>${escapeHtml(error.message)}</p><p>Ask AccessRevamp for a new private approval link.</p>`;
    }
  };

  const submitApproval = async (event) => {
    event.preventDefault();
    if (!approval || !form.reportValidity()) return;
    const selected = form.elements.selectedOption?.value;
    const selectedOptionIds = selected ? [selected] : [];
    submit.disabled = true;
    status.textContent = 'Saving your approval…';
    try {
      await responseJson(await fetch(`/api/project-approval?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ selectedOptionIds, notes: form.elements.notes.value }),
        signal: controller.signal,
        credentials: 'same-origin',
      }));
      form.hidden = true;
      summary.innerHTML += '<p><strong>Your selection was saved.</strong> AccessRevamp can now continue the next approved project stage. Do not submit payment again.</p>';
    } catch (error) {
      if (error.name === 'AbortError') return;
      status.textContent = error.message;
      submit.disabled = false;
    }
  };

  form.addEventListener('submit', submitApproval);
  load();
  return () => {
    controller.abort();
    form.removeEventListener('submit', submitApproval);
  };
}
