import '../styles/customer-hub.css';
import { getSupabase } from '../lib/supabase.js';
import { escapeHtml } from '../components/icons.js';

const API_ENDPOINT = '/api/operator-overview';
const DEFAULT_MAXIMUM_BYTES = 50 * 1024 * 1024;

const label = (value = '') => String(value)
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const formatBytes = (value) => {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

const formatDate = (value) => {
  const date = new Date(value || '');
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : 'Not recorded';
};

const projectName = (project) => {
  const customer = project.customer?.email || project.customer?.full_name || 'unlinked customer';
  return `${project.name} — ${customer}`;
};

function projectOptions(projects = []) {
  return projects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(projectName(project))}</option>`).join('');
}

function renderUpdateForm(projects) {
  if (!projects.length) return '<div class="operator-empty"><h3>No customer projects yet</h3><p>A project is created after a verified checkout is fulfilled.</p></div>';
  return `<form class="operator-form" data-operator-update-form>
    <div class="operator-form__head"><div><span class="micro-label">Customer timeline</span><h3>Publish a project update</h3></div><span class="status-pill">Private account only</span></div>
    <label>Project<select name="projectId" required>${projectOptions(projects)}</select></label>
    <div class="operator-form__split"><label>Update title<input name="title" maxlength="160" required placeholder="Homepage direction ready" /></label><label>Stage<input name="stage" maxlength="120" placeholder="design review" /></label></div>
    <label>Customer-facing update<textarea name="body" rows="5" maxlength="6000" required placeholder="Explain what was completed, what is next, and anything needed from the customer."></textarea></label>
    <div class="operator-form__split operator-form__split--three"><label>Progress %<input name="progressPercent" type="number" min="0" max="100" step="1" placeholder="45" /></label><label>Project status<select name="projectStatus"><option value="">No change</option>${['intake_pending','reviewing','concept','implementation','client_review','completed','paused','canceled'].map((value) => `<option value="${value}">${label(value)}</option>`).join('')}</select></label><label>Delivery status<select name="deliveryStatus"><option value="">No change</option>${['waiting_for_inputs','scheduled','in_progress','ready_for_delivery','delivered','paused','canceled'].map((value) => `<option value="${value}">${label(value)}</option>`).join('')}</select></label></div>
    <label>Estimated delivery date<input name="deliveryDueAt" type="datetime-local" /></label>
    <div class="operator-form__actions"><button class="button button--small" type="submit">Publish update</button><p class="form-status" role="status" aria-live="polite"></p></div>
  </form>`;
}

function renderArtifactForm(projects, uploadLimits = {}) {
  if (!projects.length) return '<div class="operator-empty"><h3>No delivery target yet</h3><p>Files can be published after a customer project exists.</p></div>';
  const maximumBytes = Number(uploadLimits.maximumBytes || DEFAULT_MAXIMUM_BYTES);
  return `<form class="operator-form" data-operator-artifact-form>
    <div class="operator-form__head"><div><span class="micro-label">Private deliverables</span><h3>Upload a file to a customer</h3></div><span class="status-pill">Up to ${escapeHtml(formatBytes(maximumBytes))}</span></div>
    <label>Project<select name="projectId" required>${projectOptions(projects)}</select></label>
    <div class="operator-form__split"><label>Customer title<input name="title" maxlength="160" required placeholder="Final website package" /></label><label>File category<select name="artifactType" required><option value="website_build">Website build</option><option value="design_image">Design image</option><option value="poster">Poster or creative</option><option value="video">Video</option><option value="audit_report">Audit report</option><option value="test_report">Test report</option><option value="delivery_manifest">Delivery manifest</option><option value="research_document">Research document</option><option value="security_report">Security report</option><option value="customer_message">Customer note</option><option value="design_md">Design notes</option><option value="skill_md">Implementation notes</option></select></label></div>
    <label>Description<textarea name="description" rows="4" maxlength="2000" placeholder="What this file contains and how the customer should use it."></textarea></label>
    <label class="operator-file-input">Private file<input name="artifactFile" type="file" required accept=".zip,.pdf,.json,.txt,.md,.png,.jpg,.jpeg,.webp,.avif,.svg,.mp4,.webm,application/zip,application/pdf,image/*,video/mp4,video/webm,text/plain,text/markdown,application/json" /><small>The file goes directly to the project’s private Supabase bucket; it is not sent through the Netlify function.</small></label>
    <label class="operator-checkbox"><input name="markDelivered" type="checkbox" /><span>Mark this as the final website delivery, set progress to 100%, and close the project.</span></label>
    <div class="operator-form__actions"><button class="button button--small" type="submit">Upload and publish</button><p class="form-status" role="status" aria-live="polite"></p></div>
  </form>`;
}

function renderRecentUpdates(updates = [], projects = []) {
  if (!updates.length) return '<p>No customer updates have been published.</p>';
  const names = new Map(projects.map((project) => [project.id, project.name]));
  return `<div class="operator-activity-list">${updates.slice(0, 12).map((update) => `<article><div><strong>${escapeHtml(update.title)}</strong><span>${escapeHtml(names.get(update.project_id) || 'Project')}</span></div><div><span>${update.progress_percent == null ? escapeHtml(label(update.stage || 'update')) : `${Number(update.progress_percent)}%`}</span><time>${escapeHtml(formatDate(update.published_at || update.created_at))}</time></div></article>`).join('')}</div>`;
}

function renderRecentArtifacts(artifacts = [], projects = []) {
  if (!artifacts.length) return '<p>No customer files have been recorded.</p>';
  const names = new Map(projects.map((project) => [project.id, project.name]));
  return `<div class="operator-activity-list">${artifacts.slice(0, 12).map((artifact) => `<article><div><strong>${escapeHtml(artifact.metadata?.title || artifact.filename || label(artifact.artifact_type))}</strong><span>${escapeHtml(names.get(artifact.project_id) || 'Project')}</span></div><div><span class="status-pill">${escapeHtml(label(artifact.status))}</span><time>${escapeHtml(formatDate(artifact.created_at))}</time></div></article>`).join('')}</div>`;
}

function renderProjects(projects = []) {
  if (!projects.length) return '<p>No customer project records.</p>';
  return `<div class="operator-project-list">${projects.map((project) => `<article><div><strong>${escapeHtml(project.name)}</strong><span>${escapeHtml(project.customer?.email || project.customer?.full_name || 'Customer not linked')}</span></div><div><span class="status-pill">${escapeHtml(label(project.status))}</span><span>${escapeHtml(label(project.delivery_status))}</span></div></article>`).join('')}</div>`;
}

function renderOverview(data) {
  const projects = data.projects || [];
  const partial = data.partialFailures?.length
    ? `<div class="notice"><strong>Partial operator data:</strong> ${data.partialFailures.map(escapeHtml).join(', ')}.</div>`
    : '';
  return `${partial}<div class="operator-hub-actions"><button class="button button--ghost button--small" type="button" data-operator-refresh>Refresh control room</button></div>
    <div class="operator-publish-grid">${renderUpdateForm(projects)}${renderArtifactForm(projects, data.uploadLimits)}</div>
    <div class="dashboard-grid operator-dashboard-grid">
      <section class="dashboard-card"><div class="card-head"><div><span class="micro-label">Delivery</span><h2>Customer projects</h2></div><span class="count-pill">${projects.length}</span></div>${renderProjects(projects)}</section>
      <section class="dashboard-card"><div class="card-head"><div><span class="micro-label">Published</span><h2>Recent updates</h2></div><span class="count-pill">${data.recentUpdates?.length || 0}</span></div>${renderRecentUpdates(data.recentUpdates, projects)}</section>
      <section class="dashboard-card"><div class="card-head"><div><span class="micro-label">Files</span><h2>Recent deliverables</h2></div><span class="count-pill">${data.recentArtifacts?.length || 0}</span></div>${renderRecentArtifacts(data.recentArtifacts, projects)}</section>
      <section class="dashboard-card"><div class="card-head"><div><span class="micro-label">Prospects</span><h2>Evidence records</h2></div><span class="count-pill">${data.prospects?.length || 0}</span></div><p>${data.prospects?.length || 0} reviewed prospect record(s), with ${data.queue?.length || 0} bounded queue record(s). Sending remains separately gated.</p></section>
      <section class="dashboard-card"><div class="card-head"><div><span class="micro-label">Finance controls</span><h2>Refund dependencies</h2></div><span class="count-pill">${data.refundDependencies?.length || 0}</span></div><p>${data.refundDependencies?.length || 0} dependency record(s) awaiting or recording resolution.</p></section>
    </div>`;
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The operator request could not be completed.');
  return data;
}

export function setupOperator() {
  const host = document.querySelector('[data-operator-content]');
  if (!host) return undefined;
  const sendingState = document.querySelector('[data-sending-state]');
  let disposed = false;
  let currentSession = null;
  let currentData = null;

  const api = async (payload) => {
    if (!currentSession) throw new Error('Operator session unavailable.');
    const response = await fetch(API_ENDPOINT, {
      method: payload ? 'POST' : 'GET',
      headers: {
        authorization: `Bearer ${currentSession.access_token}`,
        ...(payload ? { 'content-type': 'application/json' } : {}),
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    return readResponse(response);
  };

  const load = async (flash = '') => {
    const supabase = getSupabase();
    const sessionResult = await supabase?.auth.getSession();
    const session = sessionResult?.data?.session;
    if (disposed) return;
    if (!supabase || !session) {
      host.dataset.operatorState = 'signed-out';
      host.innerHTML = '<h2>Operator sign-in required</h2><p><a class="button" href="/login" data-nav>Sign in</a></p>';
      return;
    }

    currentSession = session;
    host.dataset.operatorState = 'loading';
    host.innerHTML = '<div class="loading-card" role="status"><p>Loading operator delivery controls…</p></div>';
    try {
      const data = await api();
      if (disposed) return;
      currentData = data;
      if (sendingState) sendingState.textContent = data.sendingEnabled ? 'unexpectedly enabled — investigate' : 'disabled';
      host.dataset.operatorState = 'ready';
      host.innerHTML = `${flash ? `<div class="notice notice--success"><strong>${escapeHtml(flash)}</strong></div>` : ''}${renderOverview(data)}`;
    } catch (error) {
      host.dataset.operatorState = 'denied';
      host.innerHTML = `<h2>Operator workspace unavailable</h2><p>${escapeHtml(error.message || 'Access denied')}</p>`;
    }
  };

  const submitUpdate = async (form) => {
    if (!form.reportValidity()) return;
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    button.disabled = true;
    status.textContent = 'Publishing the customer update…';
    try {
      await api({
        action: 'publish_update',
        projectId: values.get('projectId'),
        title: values.get('title'),
        body: values.get('body'),
        stage: values.get('stage'),
        progressPercent: values.get('progressPercent'),
        projectStatus: values.get('projectStatus'),
        deliveryStatus: values.get('deliveryStatus'),
        deliveryDueAt: values.get('deliveryDueAt'),
      });
      await load('The project update is now visible in the customer hub.');
    } catch (error) {
      status.textContent = error.message || 'The update could not be published.';
      button.disabled = false;
    }
  };

  const submitArtifact = async (form) => {
    if (!form.reportValidity()) return;
    const supabase = getSupabase();
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    const file = values.get('artifactFile');
    const maximumBytes = Number(currentData?.uploadLimits?.maximumBytes || DEFAULT_MAXIMUM_BYTES);
    if (!(file instanceof File) || file.size <= 0) {
      status.textContent = 'Choose a file to upload.';
      return;
    }
    if (file.size > maximumBytes) {
      status.textContent = `Choose a file no larger than ${formatBytes(maximumBytes)}.`;
      return;
    }

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status.textContent = 'Creating a private upload slot…';
    let slot = null;
    try {
      const contentType = file.type || 'application/octet-stream';
      slot = await api({
        action: 'create_artifact_upload',
        projectId: values.get('projectId'),
        filename: file.name,
        title: values.get('title'),
        description: values.get('description'),
        artifactType: values.get('artifactType'),
        contentType,
        sizeBytes: file.size,
      });

      status.textContent = `Uploading ${formatBytes(file.size)} directly to private storage…`;
      const upload = await supabase.storage
        .from(slot.bucket)
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType, cacheControl: '3600' });
      if (upload.error) throw upload.error;

      status.textContent = 'Verifying and publishing the file…';
      await api({
        action: 'finalize_artifact',
        artifactId: slot.artifactId,
        markDelivered: values.get('markDelivered') === 'on',
      });
      await load(values.get('markDelivered') === 'on'
        ? 'The final website package is available to the customer.'
        : 'The file is available in the customer hub.');
    } catch (error) {
      if (slot?.artifactId && /upload/i.test(status.textContent)) {
        await api({ action: 'cancel_artifact_upload', artifactId: slot.artifactId }).catch(() => undefined);
      }
      status.textContent = error.message || 'The file could not be published.';
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  };

  const onSubmit = (event) => {
    const updateForm = event.target.closest('[data-operator-update-form]');
    const artifactForm = event.target.closest('[data-operator-artifact-form]');
    if (!updateForm && !artifactForm) return;
    event.preventDefault();
    if (updateForm) submitUpdate(updateForm);
    else submitArtifact(artifactForm);
  };

  const onClick = (event) => {
    if (event.target.closest('[data-operator-refresh]')) load();
  };

  host.addEventListener('submit', onSubmit);
  host.addEventListener('click', onClick);
  load();
  return () => {
    disposed = true;
    currentSession = null;
    currentData = null;
    host.removeEventListener('submit', onSubmit);
    host.removeEventListener('click', onClick);
  };
}
