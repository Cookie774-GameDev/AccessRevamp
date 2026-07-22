import { randomUUID } from 'node:crypto';
import {
  assertMethod,
  assertSameOrigin,
  handleError,
  HttpError,
  json,
  readJsonBody,
} from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { requireOperator } from './_shared/operator-auth.mjs';

const BUCKET = 'customer-project-artifacts';
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_ARTIFACT_TYPES = new Set([
  'research_document',
  'audit_report',
  'security_report',
  'design_image',
  'poster',
  'video',
  'website_build',
  'test_report',
  'delivery_manifest',
  'customer_message',
  'skill_md',
  'design_md',
]);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'video/mp4',
  'video/webm',
]);
const PROJECT_STATUSES = new Set(['intake_pending', 'reviewing', 'concept', 'implementation', 'client_review', 'completed', 'paused', 'canceled']);
const DELIVERY_STATUSES = new Set(['waiting_for_inputs', 'scheduled', 'in_progress', 'ready_for_delivery', 'delivered', 'paused', 'canceled']);

function cleanName(value) {
  return String(value || 'customer-file')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'customer-file';
}

function boundedText(value, maximum, { required = false } = {}) {
  const text = String(value || '').trim();
  if (required && !text) throw new HttpError(422, 'A required field is missing.');
  if (text.length > maximum) throw new HttpError(422, 'A field is too long.');
  return text;
}

function exactInteger(value, minimum, maximum, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new HttpError(422, `${name} is invalid.`);
  }
  return number;
}

async function getProject(admin, projectId) {
  const result = await admin
    .from('customer_projects')
    .select('id,user_id,name,status,delivery_status,delivered_at')
    .eq('id', projectId)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new HttpError(404, 'Project not found.');
  return result.data;
}

async function ensurePrivateBucket(admin) {
  const current = await admin.storage.getBucket(BUCKET);
  if (!current.error) return;
  const created = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_BYTES,
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
  });
  if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
}

async function loadOverview(admin) {
  const queries = [
    ['prospects', 'prospects', 'id,business_name,website_url,source_url,observed_at,observation,evidence_strength,confidence,score,stage,created_at'],
    ['queue', 'accessrevamp_outreach_queue', 'id,prospect_id,status,follow_up_count,created_at'],
    ['refundDependencies', 'refund_dependencies', 'base_order_id,dependent_order_id,status,created_at'],
    ['projects', 'customer_projects', 'id,user_id,name,website_url,status,delivery_status,delivery_due_at,delivered_at,plan_key,scope_summary,created_at,updated_at'],
    ['recentUpdates', 'project_updates', 'id,project_id,title,body,stage,progress_percent,published_at,created_at'],
    ['recentArtifacts', 'project_artifacts', 'id,project_id,artifact_type,filename,mime_type,size_bytes,status,metadata,created_at'],
  ];

  const results = await Promise.all(queries.map(([, table, select]) => admin
    .from(table)
    .select(select)
    .order('created_at', { ascending: false })
    .limit(100)));
  const data = Object.fromEntries(results.map((result, index) => [queries[index][0], result.data || []]));
  const partialFailures = results.map((result, index) => result.error ? queries[index][0] : null).filter(Boolean);

  const userIds = [...new Set(data.projects.map((project) => project.user_id))];
  const profilesResult = userIds.length
    ? await admin.from('profiles').select('id,email,full_name').in('id', userIds)
    : { data: [], error: null };
  if (profilesResult.error) partialFailures.push('customer profiles');
  const profiles = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));
  data.projects = data.projects.map((project) => ({
    ...project,
    customer: profiles.get(project.user_id) || null,
  }));

  const settings = await admin.from('outreach_settings').select('sending_enabled').eq('singleton', true).single();
  if (settings.error) partialFailures.push('outreach settings');
  return {
    ...data,
    sendingEnabled: settings.data?.sending_enabled === true,
    uploadLimits: { maximumBytes: MAX_FILE_BYTES, bucket: BUCKET },
    partialFailures: [...new Set(partialFailures)],
  };
}

async function createArtifactUpload(admin, operator, payload) {
  const projectId = boundedText(payload.projectId, 80, { required: true });
  const filename = cleanName(boundedText(payload.filename, 180, { required: true }));
  const title = boundedText(payload.title || filename, 160, { required: true });
  const description = boundedText(payload.description, 2000);
  const artifactType = boundedText(payload.artifactType, 80, { required: true });
  const contentType = boundedText(payload.contentType || 'application/octet-stream', 120, { required: true }).toLowerCase();
  const sizeBytes = exactInteger(payload.sizeBytes, 1, MAX_FILE_BYTES, 'File size');
  if (!ALLOWED_ARTIFACT_TYPES.has(artifactType)) throw new HttpError(422, 'Artifact type is not allowed.');
  if (!ALLOWED_MIME_TYPES.has(contentType)) throw new HttpError(422, 'File type is not allowed.');

  const project = await getProject(admin, projectId);
  await ensurePrivateBucket(admin);
  const path = `${project.user_id}/${project.id}/${randomUUID()}-${filename}`;
  const artifactResult = await admin.from('project_artifacts').insert({
    project_id: project.id,
    artifact_type: artifactType,
    storage_provider: 'supabase',
    storage_path: path,
    filename,
    mime_type: contentType,
    size_bytes: sizeBytes,
    status: 'draft',
    metadata: {
      title,
      description,
      category: artifactType,
      customer_visible: false,
      uploaded_by: operator.id,
      expected_size_bytes: sizeBytes,
    },
  }).select('id').single();
  if (artifactResult.error) throw artifactResult.error;

  const signed = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (signed.error || !signed.data?.token) {
    await admin.from('project_artifacts').delete().eq('id', artifactResult.data.id);
    throw signed.error || new Error('Signed upload could not be created.');
  }

  return json({
    artifactId: artifactResult.data.id,
    bucket: BUCKET,
    path,
    token: signed.data.token,
    maximumBytes: MAX_FILE_BYTES,
  }, 201);
}

async function cancelArtifactUpload(admin, payload) {
  const artifactId = boundedText(payload.artifactId, 80, { required: true });
  const artifactResult = await admin
    .from('project_artifacts')
    .select('id,storage_path,status')
    .eq('id', artifactId)
    .maybeSingle();
  if (artifactResult.error) throw artifactResult.error;
  const artifact = artifactResult.data;
  if (!artifact || artifact.status !== 'draft') return json({ ok: true });

  if (artifact.storage_path) await admin.storage.from(BUCKET).remove([artifact.storage_path]);
  const removed = await admin.from('project_artifacts').delete().eq('id', artifact.id).eq('status', 'draft');
  if (removed.error) throw removed.error;
  return json({ ok: true });
}

async function finalizeArtifact(admin, operator, payload) {
  const artifactId = boundedText(payload.artifactId, 80, { required: true });
  const markDelivered = payload.markDelivered === true;
  const artifactResult = await admin
    .from('project_artifacts')
    .select('id,project_id,storage_path,filename,mime_type,size_bytes,status')
    .eq('id', artifactId)
    .maybeSingle();
  if (artifactResult.error) throw artifactResult.error;
  const artifact = artifactResult.data;
  if (!artifact || artifact.status !== 'draft' || !artifact.storage_path) {
    throw new HttpError(409, 'This upload cannot be finalized.');
  }

  const project = await getProject(admin, artifact.project_id);
  const expectedPrefix = `${project.user_id}/${project.id}/`;
  if (!artifact.storage_path.startsWith(expectedPrefix)) throw new HttpError(403, 'Upload path is not authorized.');

  const slash = artifact.storage_path.lastIndexOf('/');
  const folder = artifact.storage_path.slice(0, slash);
  const objectName = artifact.storage_path.slice(slash + 1);
  const listed = await admin.storage.from(BUCKET).list(folder, { limit: 20, search: objectName });
  if (listed.error) throw listed.error;
  const storedObject = (listed.data || []).find((object) => object.name === objectName);
  if (!storedObject) throw new HttpError(409, 'The file has not finished uploading.');

  const storedSize = Number(storedObject.metadata?.size || storedObject.metadata?.contentLength || 0);
  if (storedSize && storedSize !== Number(artifact.size_bytes)) {
    await admin.storage.from(BUCKET).remove([artifact.storage_path]);
    await admin.from('project_artifacts').delete().eq('id', artifact.id).eq('status', 'draft');
    throw new HttpError(409, 'The uploaded file size did not match the approved upload request.');
  }

  const finalized = await admin.rpc('operator_finalize_project_artifact', {
    p_artifact_id: artifact.id,
    p_created_by: operator.id,
    p_mark_delivered: markDelivered,
  });
  if (finalized.error) throw finalized.error;
  return json({ ok: true, ...(finalized.data || {}) });
}

async function publishUpdate(admin, operator, payload) {
  const projectId = boundedText(payload.projectId, 80, { required: true });
  const title = boundedText(payload.title, 160, { required: true });
  const body = boundedText(payload.body, 6000, { required: true });
  const stage = boundedText(payload.stage, 120);
  const progressPercent = payload.progressPercent === '' || payload.progressPercent == null
    ? null
    : exactInteger(payload.progressPercent, 0, 100, 'Progress');
  const projectStatus = payload.projectStatus ? boundedText(payload.projectStatus, 80) : null;
  const deliveryStatus = payload.deliveryStatus ? boundedText(payload.deliveryStatus, 80) : null;
  if (projectStatus && !PROJECT_STATUSES.has(projectStatus)) throw new HttpError(422, 'Project status is invalid.');
  if (deliveryStatus && !DELIVERY_STATUSES.has(deliveryStatus)) throw new HttpError(422, 'Delivery status is invalid.');

  await getProject(admin, projectId);
  let deliveryDueAt = null;
  if (payload.deliveryDueAt) {
    const dueAt = new Date(payload.deliveryDueAt);
    if (!Number.isFinite(dueAt.getTime())) throw new HttpError(422, 'Delivery date is invalid.');
    deliveryDueAt = dueAt.toISOString();
  }

  const update = await admin.rpc('operator_publish_project_update', {
    p_project_id: projectId,
    p_title: title,
    p_body: body,
    p_stage: stage || null,
    p_progress_percent: progressPercent,
    p_project_status: projectStatus,
    p_delivery_status: deliveryStatus,
    p_delivery_due_at: deliveryDueAt,
    p_created_by: operator.id,
  });
  if (update.error) throw update.error;
  return json({ ok: true, updateId: update.data }, 201);
}

export default async function operatorOverview(request) {
  try {
    if (!['GET', 'POST'].includes(request.method)) throw new HttpError(405, 'Method not allowed.');
    const admin = getSupabaseAdmin();
    const operator = await requireOperator(request, admin);
    if (request.method === 'GET') return json(await loadOverview(admin));

    assertMethod(request, 'POST');
    assertSameOrigin(request);
    const payload = await readJsonBody(request);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new HttpError(422, 'Request body is invalid.');

    switch (payload.action) {
      case 'create_artifact_upload':
        return createArtifactUpload(admin, operator, payload);
      case 'finalize_artifact':
        return finalizeArtifact(admin, operator, payload);
      case 'cancel_artifact_upload':
        return cancelArtifactUpload(admin, payload);
      case 'publish_update':
        return publishUpdate(admin, operator, payload);
      default:
        throw new HttpError(422, 'Unknown operator action.');
    }
  } catch (error) {
    return handleError(error);
  }
}
