import { assertMethod, handleError, json } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { requireConfirmedUser } from './_shared/auth.mjs';

const CUSTOMER_ARTIFACT_BUCKET = 'customer-project-artifacts';
const INTAKE_ASSET_BUCKET = 'project-intake-assets';
const SIGNED_URL_SECONDS = 15 * 60;
const CUSTOMER_ARTIFACT_STATUSES = ['approved', 'delivered'];
const CUSTOMER_DESIGN_STATUSES = ['customer_ready', 'selected', 'delivered'];
const CUSTOMER_DELIVERY_STATUSES = ['approved', 'sent', 'acknowledged'];
const COMPLETED_TASK_STATUSES = new Set(['succeeded', 'skipped']);

const projectStatusProgress = Object.freeze({
  intake_pending: 5,
  reviewing: 20,
  concept: 40,
  implementation: 65,
  client_review: 85,
  completed: 100,
  paused: 0,
  canceled: 0,
});

function rows(result, label, partialFailures) {
  if (result.error) partialFailures.push(label);
  return result.data || [];
}

function one(result, label, partialFailures) {
  if (result.error) partialFailures.push(label);
  return result.data || null;
}

function groupBy(records, key) {
  const groups = new Map();
  for (const record of records) {
    const value = record[key];
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(record);
  }
  return groups;
}

function safeExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function publicArtifactMetadata(value) {
  const metadata = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const pick = (key, maximum) => typeof metadata[key] === 'string' ? metadata[key].slice(0, maximum) : null;
  return {
    title: pick('title', 160),
    description: pick('description', 2000),
    category: pick('category', 80),
    version: pick('version', 80),
  };
}

async function createSignedUrl(admin, bucket, path, { download = false } = {}) {
  if (!path) return null;
  const result = download
    ? await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS, { download: true })
    : await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (result.error) return null;
  return result.data?.signedUrl || null;
}

async function signIntakeAssets(admin, assets) {
  return Promise.all(assets.map(async (asset) => ({
    id: asset.id,
    original_filename: asset.original_filename,
    content_type: asset.content_type,
    byte_size: asset.byte_size,
    created_at: asset.created_at,
    preview_url: await createSignedUrl(admin, INTAKE_ASSET_BUCKET, asset.storage_path),
  })));
}

async function signDesignOptions(admin, options) {
  return Promise.all(options.map(async (option) => ({
    id: option.id,
    option_group: option.option_group,
    option_number: option.option_number,
    sequence_key: option.sequence_key,
    scene_number: option.scene_number,
    revision_round: option.revision_round,
    status: option.status,
    customer_selected_at: option.customer_selected_at,
    created_at: option.created_at,
    preview_url: option.storage_path
      ? await createSignedUrl(admin, CUSTOMER_ARTIFACT_BUCKET, option.storage_path)
      : safeExternalUrl(option.external_url),
  })));
}

async function signArtifacts(admin, artifacts) {
  return Promise.all(artifacts.map(async (artifact) => {
    const isSupabase = artifact.storage_provider === 'supabase' && artifact.storage_path;
    const previewable = artifact.mime_type?.startsWith('image/') || artifact.mime_type?.startsWith('video/') || artifact.mime_type === 'application/pdf';
    const previewUrl = isSupabase && previewable
      ? await createSignedUrl(admin, CUSTOMER_ARTIFACT_BUCKET, artifact.storage_path)
      : safeExternalUrl(artifact.external_url);
    const downloadUrl = isSupabase
      ? await createSignedUrl(admin, CUSTOMER_ARTIFACT_BUCKET, artifact.storage_path, { download: true })
      : safeExternalUrl(artifact.external_url);

    return {
      id: artifact.id,
      artifact_type: artifact.artifact_type,
      filename: artifact.filename,
      mime_type: artifact.mime_type,
      size_bytes: artifact.size_bytes,
      status: artifact.status,
      created_at: artifact.created_at,
      metadata: publicArtifactMetadata(artifact.metadata),
      preview_url: previewUrl,
      download_url: downloadUrl,
    };
  }));
}

function calculateProgress(project, tasks, updates) {
  const publishedProgress = updates.find((update) => Number.isInteger(update.progress_percent))?.progress_percent;
  if (Number.isInteger(publishedProgress)) return publishedProgress;

  const required = tasks.filter((task) => task.required !== false);
  if (required.length) {
    const complete = required.filter((task) => COMPLETED_TASK_STATUSES.has(task.status)).length;
    return Math.max(projectStatusProgress[project.status] || 0, Math.round((complete / required.length) * 100));
  }
  return projectStatusProgress[project.status] ?? 0;
}

export default async function accountProjects(request) {
  try {
    assertMethod(request, 'GET');
    const admin = getSupabaseAdmin();
    const user = await requireConfirmedUser(request, admin);
    const partialFailures = [];

    const [profileResult, ordersResult, projectsResult, entitlementsResult, refundsResult] = await Promise.all([
      admin.from('profiles').select('full_name,email').eq('id', user.id).maybeSingle(),
      admin.from('orders').select('id,plan_key,amount_total,currency,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      admin.from('customer_projects').select('id,name,website_url,plan_key,status,scope_summary,delivery_status,delivery_due_at,delivered_at,creative_pack_status,creative_pack_due_at,creative_pack_delivered_at,revision_limit,created_at,updated_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      admin.from('entitlements').select('highest_tier_key,status,effective_paid_cents,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      admin.from('refund_requests').select('id,status,reason,requested_at,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    const profile = one(profileResult, 'profile', partialFailures);
    const orders = rows(ordersResult, 'orders', partialFailures);
    const projects = rows(projectsResult, 'projects', partialFailures);
    const entitlementRows = rows(entitlementsResult, 'entitlement', partialFailures);
    const refundRequests = rows(refundsResult, 'refunds', partialFailures);
    const projectIds = projects.map((project) => project.id);

    if (!projectIds.length) {
      return json({
        profile,
        entitlement: entitlementRows[0] || null,
        nextUpgrade: null,
        orders,
        projects: [],
        refundRequests,
        signedUrlExpiresIn: SIGNED_URL_SECONDS,
        partialFailures,
      });
    }

    const [intakesResult, workflowsResult, designsResult, deliveriesResult, artifactsResult, updatesResult] = await Promise.all([
      admin.from('project_intakes').select('id,project_id,selected_pages,style_notes,content_notes,cinematic_notes,project_notes,reference_urls,inspiration_choices,status,created_at,updated_at').in('project_id', projectIds).order('updated_at', { ascending: false }),
      admin.from('project_workflows').select('id,project_id,status,current_stage,revision_round,started_at,completed_at,updated_at').in('project_id', projectIds).order('created_at', { ascending: false }),
      admin.from('project_design_options').select('id,project_id,option_group,option_number,sequence_key,scene_number,revision_round,status,storage_path,external_url,customer_selected_at,created_at').in('project_id', projectIds).in('status', CUSTOMER_DESIGN_STATUSES).order('created_at', { ascending: false }),
      admin.from('project_deliveries').select('id,project_id,version,delivery_type,status,manifest,drive_url,customer_notified_at,delivered_at,created_at').in('project_id', projectIds).in('status', CUSTOMER_DELIVERY_STATUSES).order('created_at', { ascending: false }),
      admin.from('project_artifacts').select('id,project_id,artifact_type,storage_provider,storage_path,external_url,filename,mime_type,size_bytes,status,metadata,created_at').in('project_id', projectIds).in('status', CUSTOMER_ARTIFACT_STATUSES).order('created_at', { ascending: false }),
      admin.from('project_updates').select('id,project_id,title,body,stage,progress_percent,published_at,created_at').in('project_id', projectIds).not('published_at', 'is', null).order('published_at', { ascending: false }),
    ]);

    const intakes = rows(intakesResult, 'briefs', partialFailures);
    const workflows = rows(workflowsResult, 'workflow', partialFailures);
    const designs = rows(designsResult, 'designs', partialFailures);
    const deliveries = rows(deliveriesResult, 'deliveries', partialFailures);
    const artifacts = rows(artifactsResult, 'files', partialFailures);
    const updates = rows(updatesResult, 'updates', partialFailures);

    const intakeIds = intakes.map((intake) => intake.id);
    const workflowIds = workflows.map((workflow) => workflow.id);
    const [intakeAssetsResult, workflowTasksResult] = await Promise.all([
      intakeIds.length
        ? admin.from('project_intake_assets').select('id,intake_id,storage_path,original_filename,content_type,byte_size,created_at').in('intake_id', intakeIds).order('created_at', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      workflowIds.length
        ? admin.from('project_workflow_tasks').select('id,workflow_id,sequence_number,task_key,stage,status,required,revision_round,started_at,completed_at,updated_at').in('workflow_id', workflowIds).order('sequence_number', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const intakeAssets = rows(intakeAssetsResult, 'reference images', partialFailures);
    const workflowTasks = rows(workflowTasksResult, 'workflow steps', partialFailures);

    const intakesByProject = groupBy(intakes, 'project_id');
    const workflowsByProject = groupBy(workflows, 'project_id');
    const designsByProject = groupBy(designs, 'project_id');
    const deliveriesByProject = groupBy(deliveries, 'project_id');
    const artifactsByProject = groupBy(artifacts, 'project_id');
    const updatesByProject = groupBy(updates, 'project_id');
    const intakeAssetsByIntake = groupBy(intakeAssets, 'intake_id');
    const tasksByWorkflow = groupBy(workflowTasks, 'workflow_id');

    const enrichedProjects = await Promise.all(projects.map(async (project) => {
      const intake = intakesByProject.get(project.id)?.[0] || null;
      const workflow = workflowsByProject.get(project.id)?.[0] || null;
      const projectUpdates = updatesByProject.get(project.id) || [];
      const tasks = workflow ? (tasksByWorkflow.get(workflow.id) || []) : [];
      const projectDesigns = designsByProject.get(project.id) || [];
      const projectArtifacts = artifactsByProject.get(project.id) || [];
      const rawIntakeAssets = intake ? (intakeAssetsByIntake.get(intake.id) || []) : [];

      const [signedIntakeAssets, signedDesigns, signedProjectArtifacts] = await Promise.all([
        signIntakeAssets(admin, rawIntakeAssets),
        signDesignOptions(admin, projectDesigns),
        signArtifacts(admin, projectArtifacts),
      ]);

      return {
        ...project,
        progress_percent: calculateProgress(project, tasks, projectUpdates),
        latest_update: projectUpdates[0] || null,
        updates: projectUpdates,
        brief: intake ? {
          id: intake.id,
          selected_pages: intake.selected_pages,
          style_notes: intake.style_notes,
          content_notes: intake.content_notes,
          cinematic_notes: intake.cinematic_notes,
          project_notes: intake.project_notes,
          reference_urls: (intake.reference_urls || []).map(safeExternalUrl).filter(Boolean),
          inspiration_choices: intake.inspiration_choices,
          status: intake.status,
          updated_at: intake.updated_at,
          assets: signedIntakeAssets,
        } : null,
        workflow: workflow ? {
          id: workflow.id,
          status: workflow.status,
          current_stage: workflow.current_stage,
          revision_round: workflow.revision_round,
          started_at: workflow.started_at,
          completed_at: workflow.completed_at,
          updated_at: workflow.updated_at,
          tasks,
        } : null,
        design_options: signedDesigns,
        artifacts: signedProjectArtifacts,
        deliveries: (deliveriesByProject.get(project.id) || []).map((delivery) => ({
          id: delivery.id,
          version: delivery.version,
          delivery_type: delivery.delivery_type,
          status: delivery.status,
          drive_url: safeExternalUrl(delivery.drive_url),
          customer_notified_at: delivery.customer_notified_at,
          delivered_at: delivery.delivered_at,
          created_at: delivery.created_at,
        })),
      };
    }));

    return json({
      profile,
      entitlement: entitlementRows[0] || null,
      nextUpgrade: null,
      orders,
      projects: enrichedProjects,
      refundRequests,
      signedUrlExpiresIn: SIGNED_URL_SECONDS,
      partialFailures: [...new Set(partialFailures)],
    });
  } catch (error) {
    return handleError(error);
  }
}
