import { randomUUID } from 'node:crypto';
import { assertMethod, assertSameOrigin, handleError, HttpError, json } from './_shared/http.mjs';
import { requireConfirmedUser } from './_shared/auth.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { projectIntakeTextSchema } from './_shared/validation.mjs';

const BUCKET = 'project-intake-assets';
const MAX_REQUEST_BYTES = 70 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 8;
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

const cleanName = (value) => String(value || 'reference-image')
  .normalize('NFKD')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90) || 'reference-image';

function parseReferenceUrls(value) {
  return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

async function ensurePrivateBucket(admin) {
  const current = await admin.storage.getBucket(BUCKET);
  if (!current.error) return;
  const created = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_BYTES,
    allowedMimeTypes: [...MIME_TYPES],
  });
  if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
}

export default async function projectIntake(request) {
  const uploadedPaths = [];
  const createdMetadataPaths = [];
  let admin;
  try {
    assertMethod(request, 'POST');
    assertSameOrigin(request);
    const length = Number(request.headers.get('content-length') || 0);
    if (length > MAX_REQUEST_BYTES) throw new HttpError(413, 'The project brief is too large.');
    if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('multipart/form-data')) {
      throw new HttpError(415, 'Project briefs must use multipart form data.');
    }
    admin = getSupabaseAdmin();
    const user = await requireConfirmedUser(request, admin);
    const form = await request.formData();
    const parsedPayload = projectIntakeTextSchema.safeParse({
      projectId: String(form.get('projectId') || ''),
      plan: String(form.get('plan') || ''),
      pages: form.getAll('pages').map(String),
      styleNotes: String(form.get('styleNotes') || ''),
      contentNotes: String(form.get('contentNotes') || ''),
      cinematicNotes: String(form.get('cinematicNotes') || ''),
      projectNotes: String(form.get('projectNotes') || ''),
      referenceUrls: parseReferenceUrls(form.get('referenceUrls')),
      inspirationChoices: form.getAll('inspirationChoice').map(String),
      rightsConfirmed: form.get('rightsConfirmed') === 'on' || form.get('rightsConfirmed') === 'true',
    });
    if (!parsedPayload.success) throw new HttpError(422, parsedPayload.error.issues[0]?.message || 'Check the project brief fields.');
    const payload = parsedPayload.data;
    const files = form.getAll('styleImages').filter((value) => typeof value === 'object' && 'arrayBuffer' in value && value.size > 0);
    if (files.length > MAX_FILES) throw new HttpError(422, `Upload no more than ${MAX_FILES} images.`);
    for (const file of files) {
      if (!MIME_TYPES.has(file.type) || file.size > MAX_FILE_BYTES) throw new HttpError(422, 'Each upload must be a JPG, PNG, WebP, or AVIF image no larger than 8MB.');
    }
    const projectResult = await admin.from('customer_projects').select('id,user_id,plan_key').eq('id', payload.projectId).eq('user_id', user.id).maybeSingle();
    if (projectResult.error) throw projectResult.error;
    const project = projectResult.data;
    if (!project || !['complete_revamp', 'cinematic_scroll'].includes(project.plan_key) || project.plan_key !== payload.plan) {
      throw new HttpError(403, 'A matching paid Complete or Cinematic customer project is required.');
    }
    await ensurePrivateBucket(admin);
    const intakeResult = await admin.from('project_intakes').upsert({
      project_id: project.id,
      user_id: user.id,
      plan_key: payload.plan,
      selected_pages: payload.pages,
      style_notes: payload.styleNotes,
      content_notes: payload.contentNotes,
      cinematic_notes: payload.cinematicNotes,
      project_notes: payload.projectNotes,
      reference_urls: payload.referenceUrls,
      inspiration_choices: payload.inspirationChoices,
      rights_confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id' }).select('id').single();
    if (intakeResult.error) throw intakeResult.error;
    const intakeId = intakeResult.data.id;
    if (files.length) {
      const oldAssets = await admin.from('project_intake_assets').select('storage_path').eq('intake_id', intakeId);
      if (oldAssets.error) throw oldAssets.error;
      const nextAssets = [];
      for (const file of files) {
        const path = `${user.id}/${project.id}/${randomUUID()}-${cleanName(file.name)}`;
        const upload = await admin.storage.from(BUCKET).upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
        if (upload.error) throw upload.error;
        uploadedPaths.push(path);
        nextAssets.push({ intake_id: intakeId, storage_path: path, original_filename: cleanName(file.name), content_type: file.type, byte_size: file.size });
      }
      const metadata = await admin.from('project_intake_assets').insert(nextAssets);
      if (metadata.error) throw metadata.error;
      createdMetadataPaths.push(...nextAssets.map((asset) => asset.storage_path));
      const oldPaths = oldAssets.data?.map((asset) => asset.storage_path).filter(Boolean) || [];
      if (oldPaths.length) {
        const removedMetadata = await admin.from('project_intake_assets').delete().in('storage_path', oldPaths);
        if (removedMetadata.error) throw removedMetadata.error;
        await admin.storage.from(BUCKET).remove(oldPaths);
      }
    }
    return json({ ok: true, reference: intakeId }, 201);
  } catch (error) {
    if (admin && createdMetadataPaths.length) await admin.from('project_intake_assets').delete().in('storage_path', createdMetadataPaths);
    if (admin && uploadedPaths.length) await admin.storage.from(BUCKET).remove(uploadedPaths).catch(() => undefined);
    return handleError(error);
  }
}
