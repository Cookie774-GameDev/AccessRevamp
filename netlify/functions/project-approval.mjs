import { createHash } from 'node:crypto';
import { assertSameOrigin, handleError, HttpError, json, readJsonBody } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPTION_PURPOSES = new Set(['homepage_selection', 'revision_selection', 'cinematic_sequence_selection', 'scene_selection']);
const ARTIFACT_BUCKET = 'customer-project-artifacts';

const tokenHash = (token) => createHash('sha256').update(token).digest('hex');

function validToken(request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!TOKEN_PATTERN.test(token)) throw new HttpError(404, 'This approval link is invalid.');
  return token;
}

async function signedOption(admin, option) {
  let imageUrl = option.external_url || '';
  if (!imageUrl && option.storage_path) {
    const signed = await admin.storage.from(ARTIFACT_BUCKET).createSignedUrl(option.storage_path, 30 * 60);
    if (!signed.error) imageUrl = signed.data?.signedUrl || '';
  }
  return {
    id: option.id,
    optionGroup: option.option_group,
    optionNumber: option.option_number,
    sequenceKey: option.sequence_key,
    sceneNumber: option.scene_number,
    revisionRound: option.revision_round,
    promptSummary: option.prompt_summary || '',
    imageUrl,
  };
}

async function loadApproval(admin, hash) {
  const { data: link, error: linkError } = await admin
    .from('project_approval_links')
    .select('id,project_id,purpose,status,expires_at,used_at')
    .eq('token_hash', hash)
    .maybeSingle();
  if (linkError) throw linkError;
  if (!link) throw new HttpError(404, 'This approval link was not found.');
  if (link.status === 'used') throw new HttpError(409, 'This approval link has already been used.');
  if (link.status !== 'active') throw new HttpError(410, 'This approval link is no longer active.');
  if (new Date(link.expires_at).getTime() <= Date.now()) throw new HttpError(410, 'This approval link has expired.');

  const { data: project, error: projectError } = await admin
    .from('customer_projects')
    .select('id,name,website_url,plan_key,cinematic_scene_count,revision_limit')
    .eq('id', link.project_id)
    .single();
  if (projectError) throw projectError;

  let options = [];
  if (OPTION_PURPOSES.has(link.purpose)) {
    const { data, error } = await admin
      .from('project_design_options')
      .select('id,option_group,option_number,sequence_key,scene_number,revision_round,storage_path,external_url,prompt_summary,status')
      .eq('project_id', link.project_id)
      .in('status', ['customer_ready', 'selected'])
      .order('option_number', { ascending: true });
    if (error) throw error;
    options = await Promise.all((data || []).map((option) => signedOption(admin, option)));
  }

  return {
    purpose: link.purpose,
    expiresAt: link.expires_at,
    project: {
      id: project.id,
      name: project.name,
      websiteUrl: project.website_url || '',
      planKey: project.plan_key,
      cinematicSceneCount: project.cinematic_scene_count,
      revisionLimit: project.revision_limit,
    },
    options,
  };
}

export default async function projectApproval(request) {
  try {
    const token = validToken(request);
    const hash = tokenHash(token);
    const admin = getSupabaseAdmin();

    if (request.method === 'GET') {
      return json({ ok: true, ...(await loadApproval(admin, hash)) });
    }

    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    assertSameOrigin(request);
    const body = await readJsonBody(request);
    const selectedOptionIds = Array.isArray(body.selectedOptionIds) ? body.selectedOptionIds : [];
    if (selectedOptionIds.length > 20 || selectedOptionIds.some((id) => !UUID_PATTERN.test(String(id)))) {
      throw new HttpError(422, 'The selected option is invalid.');
    }
    const notes = String(body.notes || '').trim();
    if (notes.length > 2000) throw new HttpError(422, 'Approval notes are too long.');

    const { data, error } = await admin.rpc('submit_accessrevamp_project_approval', {
      p_token_hash: hash,
      p_selected_option_ids: selectedOptionIds,
      p_customer_notes: notes,
    });
    if (error) {
      const message = String(error.message || '');
      if (/not found/i.test(message)) throw new HttpError(404, 'This approval link was not found.');
      if (/expired|not active/i.test(message)) throw new HttpError(410, 'This approval link is no longer active.');
      if (/already been used/i.test(message)) throw new HttpError(409, 'This approval link has already been used.');
      if (/choose|required number|not available|invalid|too long/i.test(message)) throw new HttpError(422, message);
      throw error;
    }

    return json({ ok: true, approval: data });
  } catch (error) {
    return handleError(error);
  }
}
