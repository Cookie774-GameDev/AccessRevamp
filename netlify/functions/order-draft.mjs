import { randomUUID } from 'node:crypto';
import { requireConfirmedUser } from './_shared/auth.mjs';
import { assertMethod, assertSameOrigin, handleError, HttpError, json } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { orderDraftTextSchema } from './_shared/validation.mjs';

const BUCKET = 'order-draft-assets';
const MAX_REQUEST_BYTES = 70 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 8;
const MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/avif',
  'video/mp4', 'video/webm', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'application/zip', 'application/x-zip-compressed',
]);

const cleanName = (value) => String(value || 'reference-file')
  .normalize('NFKD')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90) || 'reference-file';

async function ensurePrivateBucket(admin) {
  const current = await admin.storage.getBucket(BUCKET);
  if (!current.error) {
    if (current.data?.public) throw new Error('Order draft storage must remain private.');
    return;
  }
  const created = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_BYTES,
    allowedMimeTypes: [...MIME_TYPES],
  });
  if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
}

export default async function orderDraft(request) {
  const uploadedPaths = [];
  const insertedPaths = [];
  let admin;
  try {
    assertMethod(request, 'POST');
    assertSameOrigin(request);
    const length = Number(request.headers.get('content-length') || 0);
    if (length > MAX_REQUEST_BYTES) throw new HttpError(413, 'The project request is too large.');
    if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('multipart/form-data')) {
      throw new HttpError(415, 'Project requests must use multipart form data.');
    }

    admin = getSupabaseAdmin();
    const user = await requireConfirmedUser(request, admin);
    const form = await request.formData();
    const parsed = orderDraftTextSchema.safeParse({
      requestId: String(form.get('requestId') || ''),
      planKey: String(form.get('orderPlan') || ''),
      fullName: String(form.get('fullName') || ''),
      businessName: String(form.get('businessName') || ''),
      websiteUrl: String(form.get('websiteUrl') || ''),
      email: String(form.get('email') || ''),
      phone: String(form.get('phone') || ''),
      businessNiche: String(form.get('businessNiche') || ''),
      mainGoal: String(form.get('mainGoal') || ''),
      requestedPages: String(form.get('requestedPages') || ''),
      integrations: String(form.get('integrations') || ''),
      styleDirection: String(form.get('styleDirection') || ''),
      contentStatus: String(form.get('contentStatus') || ''),
      launchDate: String(form.get('launchDate') || ''),
      referenceUrls: String(form.get('referenceUrls') || ''),
      specificRequest: String(form.get('specificRequest') || ''),
      cinematicDirection: String(form.get('cinematicDirection') || ''),
      termsAccepted: form.get('termsAccepted') === 'on' || form.get('termsAccepted') === 'true',
    });
    if (!parsed.success) throw new HttpError(422, parsed.error.issues[0]?.message || 'Check the project request fields.');
    const payload = parsed.data;
    if (payload.email !== user.email) throw new HttpError(403, 'Use the confirmed account email for checkout.');

    const files = form.getAll('referenceFiles')
      .filter((value) => typeof value === 'object' && 'arrayBuffer' in value && value.size > 0);
    if (files.length > MAX_FILES) throw new HttpError(422, `Upload no more than ${MAX_FILES} files.`);
    for (const file of files) {
      if (!MIME_TYPES.has(file.type) || file.size > MAX_FILE_BYTES) {
        throw new HttpError(422, 'Each reference file must be a supported type no larger than 8MB.');
      }
    }

    const { data: draftId, error: draftError } = await admin.rpc('save_accessrevamp_order_draft', {
      p_user_id: user.id,
      p_request_id: payload.requestId,
      p_payload: {
        plan_key: payload.planKey,
        full_name: payload.fullName,
        business_name: payload.businessName,
        website_url: payload.websiteUrl,
        email: payload.email,
        phone: payload.phone,
        business_niche: payload.businessNiche,
        main_goal: payload.mainGoal,
        requested_pages: payload.requestedPages,
        integrations: payload.integrations,
        style_direction: payload.styleDirection,
        content_status: payload.contentStatus,
        desired_launch_date: payload.launchDate,
        reference_urls: payload.referenceUrls,
        specific_request: payload.specificRequest,
        cinematic_direction: payload.cinematicDirection,
      },
    });
    if (draftError || !draftId) throw new HttpError(503, 'The project request could not be saved.');

    await ensurePrivateBucket(admin);
    const oldAssets = await admin.from('order_draft_assets')
      .select('storage_path')
      .eq('draft_id', draftId);
    if (oldAssets.error) throw oldAssets.error;

    if (files.length) {
      const nextAssets = [];
      for (const file of files) {
        const path = `${user.id}/${draftId}/${randomUUID()}-${cleanName(file.name)}`;
        const upload = await admin.storage.from(BUCKET).upload(
          path,
          new Uint8Array(await file.arrayBuffer()),
          { contentType: file.type, upsert: false },
        );
        if (upload.error) throw upload.error;
        uploadedPaths.push(path);
        nextAssets.push({
          draft_id: draftId,
          storage_path: path,
          original_filename: cleanName(file.name),
          content_type: file.type,
          byte_size: file.size,
        });
      }
      const inserted = await admin.from('order_draft_assets').insert(nextAssets);
      if (inserted.error) throw inserted.error;
      insertedPaths.push(...nextAssets.map((asset) => asset.storage_path));

      const oldPaths = (oldAssets.data || []).map((asset) => asset.storage_path).filter(Boolean);
      if (oldPaths.length) {
        const removedMetadata = await admin.from('order_draft_assets').delete().in('storage_path', oldPaths);
        if (removedMetadata.error) throw removedMetadata.error;
        await admin.storage.from(BUCKET).remove(oldPaths);
      }
    }

    const assetCount = files.length || (oldAssets.data || []).length;
    return json({ ok: true, draftId, assetCount }, 201);
  } catch (error) {
    if (admin && insertedPaths.length) {
      await admin.from('order_draft_assets').delete().in('storage_path', insertedPaths).catch(() => undefined);
    }
    if (admin && uploadedPaths.length) {
      await admin.storage.from(BUCKET).remove(uploadedPaths).catch(() => undefined);
    }
    return handleError(error);
  }
}
