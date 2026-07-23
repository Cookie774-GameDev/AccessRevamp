import { plans, siteConfig } from '../config.js';
import { escapeHtml } from '../components/icons.js';

const STORAGE_KEY = 'accessrevamp-order-draft-v1';
const PENDING_PLAN_KEY = 'accessrevamp:pending-plan';
const MAX_FILES = 8;
const MAX_BYTES = 8 * 1024 * 1024;
const PAID_PLANS = new Set(['homepage_reveal', 'complete_revamp', 'cinematic_scroll']);
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip', 'application/x-zip-compressed']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function setupOrderWizard(root = document) {
  const form = root.querySelector('[data-order-wizard]');
  if (!form) return undefined;
  const panels = [...form.querySelectorAll('[data-order-panel]')];
  const steps = [...form.querySelectorAll('[data-order-step-jump]')];
  const previous = form.querySelector('[data-order-previous]');
  const next = form.querySelector('[data-order-next]');
  const status = form.querySelector('[data-order-status]');
  const summary = form.querySelector('[data-order-summary]');
  const questionPlan = form.querySelector('[data-order-question-plan]');
  const checkout = form.querySelector('[data-order-checkout][data-checkout]');
  const cinematicFields = [...form.querySelectorAll('[data-cinematic-fields]')];
  const cinematicSceneCount = form.elements.cinematicSceneCount;
  const cinematicDirection = form.elements.cinematicDirection;
  const fileInput = form.querySelector('[data-order-file-input]');
  const fileList = form.querySelector('[data-order-file-list]');
  let current = 0;
  let files = [];
  let requestId = crypto.randomUUID();

  const selectedPlan = () => form.elements.orderPlan?.value || 'complete_revamp';
  const exposeRequestId = () => { form.dataset.orderRequestId = requestId; };
  const syncFileInput = () => {
    if (typeof DataTransfer === 'undefined') return;
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    fileInput.files = transfer.files;
  };
  const save = () => {
    const draft = {};
    new FormData(form).forEach((value, key) => { if (typeof value === 'string') draft[key] = value; });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ current, draft, requestId })); } catch { /* Draft persistence is optional when storage is unavailable. */ }
  };
  const restore = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      Object.entries(saved.draft || {}).forEach(([name, value]) => {
        const controls = [...form.elements].filter((control) => control.name === name);
        controls.forEach((control) => {
          if (control.type === 'radio' || control.type === 'checkbox') control.checked = control.value === value || value === 'on';
          else control.value = value;
        });
      });
      current = Math.min(4, Math.max(0, Number(saved.current) || 0));
      if (UUID_PATTERN.test(saved.requestId || '')) requestId = saved.requestId;
    } catch { localStorage.removeItem(STORAGE_KEY); }

    try {
      const pendingPlan = sessionStorage.getItem(PENDING_PLAN_KEY);
      if (PAID_PLANS.has(pendingPlan)) {
        const planControl = form.querySelector(`input[name="orderPlan"][value="${pendingPlan}"]`);
        if (planControl) planControl.checked = true;
        sessionStorage.removeItem(PENDING_PLAN_KEY);
      }
    } catch { /* Plan preselection is optional. */ }
    exposeRequestId();
  };
  const renderFiles = () => {
    fileList.innerHTML = files.map((file, index) => `<li><span>${escapeHtml(file.name)}</span><small>${(file.size / 1024 / 1024).toFixed(1)} MB</small><button type="button" data-order-remove-file="${index}" aria-label="Remove ${escapeHtml(file.name)}">Remove</button></li>`).join('');
  };
  const renderQuestionPlan = () => {
    const plan = plans[selectedPlan()];
    if (!questionPlan || !plan) return;
    questionPlan.innerHTML = `<dl><div><dt>Selected plan</dt><dd><strong>${escapeHtml(plan.name)}</strong> · ${escapeHtml(plan.displayPrice)} once</dd></div><div><dt>Plan focus</dt><dd>${escapeHtml(plan.summary)}</dd></div></dl><div><strong>Every included perk</strong><ul aria-label="${escapeHtml(plan.name)} included perks">${plan.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul></div>`;
  };
  const renderSummary = () => {
    const planKey = selectedPlan();
    const plan = plans[planKey];
    const value = (name) => escapeHtml(form.elements[name]?.value || 'Not provided');
    const cinematicSummary = planKey === 'cinematic_scroll'
      ? `<div><dt>Cinematic scope</dt><dd>${value('cinematicSceneCount')} scenes · ${value('cinematicDirection')}</dd></div>`
      : '';
    const portfolioSummary = form.elements.portfolioConsent?.checked
      ? 'Optional portfolio permission granted; future use remains revocable.'
      : 'No portfolio permission granted.';
    summary.innerHTML = `<dl><div><dt>Customer</dt><dd>${value('fullName')} · ${value('email')}</dd></div><div><dt>Business</dt><dd>${value('businessName')} · ${value('businessNiche')}</dd></div><div><dt>Website</dt><dd>${value('websiteUrl')}</dd></div><div><dt>Plan</dt><dd>${escapeHtml(plan.name)} · ${escapeHtml(plan.displayPrice)} once</dd></div>${cinematicSummary}<div><dt>Request</dt><dd>${value('mainGoal')}</dd></div><div><dt>Files</dt><dd>${files.length ? files.map((file) => escapeHtml(file.name)).join(', ') : 'None'}</dd></div><div><dt>Portfolio</dt><dd>${escapeHtml(portfolioSummary)}</dd></div><div><dt>Subtotal</dt><dd>${escapeHtml(plan.displayPrice)}</dd></div><div><dt>Taxes / fees</dt><dd>${siteConfig.liveCheckoutEnabled ? 'Calculated during secure payment when applicable' : 'Not collected with this request'}</dd></div><div><dt>Total</dt><dd>${escapeHtml(plan.displayPrice)} before verified credit</dd></div></dl><ul>${plan.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul><p>First delivery targets 3 business days after payment and receipt of required assets. The written scope governs revisions and integrations.</p>`;
    checkout.dataset.checkout = plan.key;
    checkout.textContent = siteConfig.liveCheckoutEnabled ? `Continue with ${plan.name}` : `Save ${plan.name} request`;
  };
  const updatePlanFields = () => {
    const enabled = selectedPlan() === 'cinematic_scroll';
    cinematicFields.forEach((field) => { field.hidden = !enabled; });
    if (cinematicSceneCount) {
      cinematicSceneCount.disabled = !enabled;
      cinematicSceneCount.required = enabled;
      if (!enabled) cinematicSceneCount.value = '';
    }
    if (cinematicDirection) cinematicDirection.disabled = !enabled;
  };
  const show = (index) => {
    current = Math.min(4, Math.max(0, index));
    panels.forEach((panel, panelIndex) => { panel.hidden = panelIndex !== current; });
    steps.forEach((step, stepIndex) => step.setAttribute('aria-current', stepIndex === current ? 'step' : 'false'));
    previous.hidden = current === 0;
    next.hidden = current === 4;
    next.textContent = current === 3 ? (siteConfig.liveCheckoutEnabled ? 'Continue to payment' : 'Continue to submit') : 'Continue';
    status.textContent = `Step ${current + 1} of 5`;
    if (current === 2) renderQuestionPlan();
    if (current >= 3) renderSummary();
    save();
  };
  const validatePanel = () => {
    const required = [...panels[current].querySelectorAll('[required]')];
    const invalid = required.find((control) => !control.checkValidity());
    if (!invalid) return true;
    invalid.reportValidity();
    invalid.focus();
    status.textContent = 'Complete the highlighted field before continuing.';
    return false;
  };
  const normalizeUrl = () => {
    const input = form.elements.websiteUrl;
    if (input.value && !/^https?:\/\//i.test(input.value)) input.value = `https://${input.value}`;
  };
  const onNext = () => { normalizeUrl(); if (validatePanel()) show(current + 1); };
  const onPrevious = () => show(current - 1);
  const onStep = (event) => {
    const target = event.target.closest('[data-order-step-jump]');
    if (!target) return;
    const requested = Number(target.dataset.orderStepJump);
    if (requested <= current) show(requested);
    else if (requested === current + 1 && validatePanel()) show(requested);
  };
  const onChange = (event) => {
    if (event.target?.name === 'orderPlan') {
      updatePlanFields();
      renderQuestionPlan();
    }
    save();
  };
  const onFiles = () => {
    const incoming = [...(fileInput.files || [])];
    files = incoming.filter((file) => ALLOWED.has(file.type) && file.size <= MAX_BYTES).slice(0, MAX_FILES);
    syncFileInput();
    renderFiles();
    status.textContent = files.length === incoming.length ? `${files.length} reference file${files.length === 1 ? '' : 's'} selected.` : 'Some files were skipped. Use supported files no larger than 8MB.';
  };
  const onRemove = (event) => {
    const button = event.target.closest('[data-order-remove-file]');
    if (!button) return;
    files.splice(Number(button.dataset.orderRemoveFile), 1);
    syncFileInput();
    renderFiles();
  };
  const onRequestIdRotated = (event) => {
    const nextRequestId = event.detail?.requestId;
    if (!UUID_PATTERN.test(nextRequestId || '')) return;
    requestId = nextRequestId;
    exposeRequestId();
    save();
  };
  const onSubmit = (event) => event.preventDefault();

  restore();
  updatePlanFields();
  renderQuestionPlan();
  show(current);
  next.addEventListener('click', onNext);
  previous.addEventListener('click', onPrevious);
  form.addEventListener('click', onStep);
  form.addEventListener('input', onChange);
  form.addEventListener('change', onChange);
  form.addEventListener('order-request-id-rotated', onRequestIdRotated);
  form.addEventListener('submit', onSubmit);
  fileInput.addEventListener('change', onFiles);
  fileList.addEventListener('click', onRemove);
  return () => {
    next.removeEventListener('click', onNext);
    previous.removeEventListener('click', onPrevious);
    form.removeEventListener('click', onStep);
    form.removeEventListener('input', onChange);
    form.removeEventListener('change', onChange);
    form.removeEventListener('order-request-id-rotated', onRequestIdRotated);
    form.removeEventListener('submit', onSubmit);
    fileInput.removeEventListener('change', onFiles);
    fileList.removeEventListener('click', onRemove);
  };
}
