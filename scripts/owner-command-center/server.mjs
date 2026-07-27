import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { renderOwnerCommandCenter } from './ui.mjs';

const HOST = '127.0.0.1';
const PORT = Number(process.env.OWNER_COMMAND_CENTER_PORT || 4177);
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vbkkimvedmklebghtkzs.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in this local terminal.');
const admin = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
const bootstrapToken = randomBytes(32).toString('hex');
const sessionToken = randomBytes(32).toString('hex');
const csrfToken = randomBytes(32).toString('hex');
let bootstrapUsed = false;

const equal = (left, right) => {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
};
const cookieValue = (request) => String(request.headers.cookie || '').split(';').map((x) => x.trim()).find((x) => x.startsWith('ar_owner='))?.slice(9) || '';
const secureHeaders = {
  'cache-control': 'no-store',
  'content-security-policy': "default-src 'self'; img-src 'self' https://*.supabase.co data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};
const send = (response, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
  response.writeHead(status, { ...secureHeaders, 'content-type': type, ...extra });
  response.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
};
const readBody = async (request) => {
  let value = '';
  for await (const chunk of request) {
    value += chunk;
    if (value.length > 12_000) throw new Error('Request too large.');
  }
  return JSON.parse(value || '{}');
};
const text = (value, max = 4000) => {
  const result = String(value || '').trim();
  if (!result || result.length > max) throw new Error('Invalid command value.');
  return result;
};
async function operatorId() {
  if (process.env.OWNER_COMMAND_CENTER_OPERATOR_ID) return process.env.OWNER_COMMAND_CENTER_OPERATOR_ID;
  const result = await admin.from('accessrevamp_operators').select('user_id').eq('active', true).limit(2);
  if (result.error) throw result.error;
  if (result.data.length !== 1) throw new Error('Set OWNER_COMMAND_CENTER_OPERATOR_ID because active owner selection is ambiguous.');
  return result.data[0].user_id;
}
async function overview() {
  const [projects, options, feedback, events] = await Promise.all([
    admin.from('customer_projects').select('id,user_id,name,website_url,status,delivery_status,plan_key,created_at').order('created_at', { ascending: false }).limit(100),
    admin.from('project_design_options').select('id,project_id,parent_option_id,option_group,option_number,revision_round,status,storage_path,external_url,prompt_summary,submitted_by_agent,submission_note,design_review_status,delivery_review_status,created_at,updated_at').order('created_at', { ascending: false }).limit(200),
    admin.from('project_creative_feedback').select('id,project_id,design_option_id,assigned_agent,note,status,routed_task_id,created_at,resolved_at').order('created_at', { ascending: false }).limit(300),
    admin.from('project_creative_review_events').select('id,project_id,design_option_id,event_type,details,created_at').order('created_at', { ascending: false }).limit(500),
  ]);
  for (const result of [projects, options, feedback, events]) if (result.error) throw result.error;
  const userIds = [...new Set(projects.data.map((p) => p.user_id))];
  const profiles = userIds.length ? await admin.from('profiles').select('id,email,full_name').in('id', userIds) : { data: [] };
  if (profiles.error) throw profiles.error;
  const profileMap = new Map(profiles.data.map((p) => [p.id, p]));
  const optionIds = options.data.map((o) => o.id);
  const links = optionIds.length ? await admin.from('project_design_option_assets').select('design_option_id,asset_role,source_asset_id').in('design_option_id', optionIds) : { data: [] };
  if (links.error) throw links.error;
  const sourceIds = [...new Set(links.data.map((x) => x.source_asset_id))];
  const assets = sourceIds.length ? await admin.from('project_source_assets').select('id,product_identifier,original_filename,sha256,source_url,rights_status,verification_status').in('id', sourceIds) : { data: [] };
  if (assets.error) throw assets.error;
  const assetMap = new Map(assets.data.map((a) => [a.id, a]));
  const linked = new Map();
  for (const link of links.data) linked.set(link.design_option_id, [...(linked.get(link.design_option_id) || []), { ...link, asset: assetMap.get(link.source_asset_id) || null }]);
  const creativeOptions = await Promise.all(options.data.map(async (option) => {
    let preview_url = option.external_url || '';
    if (!preview_url && option.storage_path) {
      const signed = await admin.storage.from('customer-project-artifacts').createSignedUrl(option.storage_path, 900);
      preview_url = signed.data?.signedUrl || '';
    }
    return { ...option, preview_url, source_assets: linked.get(option.id) || [] };
  }));
  return { projects: projects.data.map((p) => ({ ...p, customer: profileMap.get(p.user_id) || null })), creativeOptions, creativeFeedback: feedback.data, creativeEvents: events.data };
}
async function mutate(payload) {
  const owner = await operatorId();
  const optionId = text(payload.optionId, 80);
  if (payload.action === 'request_creative_changes') {
    const note = text(payload.note);
    if (note.length < 8) throw new Error('Critique must be actionable.');
    const result = await admin.rpc('request_accessrevamp_creative_changes', {
      p_option_id: optionId, p_operator_id: owner, p_note: note, p_idempotency_key: text(payload.idempotencyKey, 180),
    });
    if (result.error) throw result.error;
    const feedback = await admin.from('project_creative_feedback').select('routed_task_id').eq('id', result.data).single();
    if (feedback.error) throw feedback.error;
    const task = await admin.from('project_workflow_tasks').select('id,assigned_agent,status').eq('id', feedback.data.routed_task_id).maybeSingle();
    if (task.error) throw task.error;
    return { ok: true, feedbackId: result.data, routedTask: task.data || null };
  }
  const rpc = payload.action === 'approve_creative_design'
    ? 'approve_accessrevamp_creative_design'
    : payload.action === 'approve_creative_delivery'
      ? 'approve_accessrevamp_creative_delivery'
      : '';
  if (!rpc) throw new Error('Unknown command.');
  const result = await admin.rpc(rpc, { p_option_id: optionId, p_operator_id: owner });
  if (result.error) throw result.error;
  return { ok: true };
}
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${HOST}:${PORT}`);
    if (url.pathname === '/unlock' && request.method === 'GET') {
      if (bootstrapUsed || !equal(url.searchParams.get('token'), bootstrapToken)) return send(response, 403, { error: 'Local owner session denied.' });
      bootstrapUsed = true;
      return send(response, 302, '', 'text/plain; charset=utf-8', { location: '/', 'set-cookie': `ar_owner=${sessionToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
    }
    if (!equal(cookieValue(request), sessionToken)) return send(response, 401, { error: 'Open this command center with its private launcher.' });
    if (url.pathname === '/' && request.method === 'GET') return send(response, 200, renderOwnerCommandCenter({ csrfToken }), 'text/html; charset=utf-8');
    if (url.pathname === '/api/review' && request.method === 'GET') return send(response, 200, await overview());
    if (url.pathname === '/api/review' && request.method === 'POST') {
      if (!equal(request.headers['x-owner-csrf'], csrfToken)) return send(response, 403, { error: 'Mutation token rejected.' });
      return send(response, 200, await mutate(await readBody(request)));
    }
    return send(response, 404, { error: 'Not found.' });
  } catch (error) {
    return send(response, 500, { error: error.message || 'Command center unavailable.' });
  }
});
server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}/unlock?token=${bootstrapToken}`;
  console.log(`Private owner command center: ${url}`);
  if (process.platform === 'win32' && process.env.OWNER_COMMAND_CENTER_NO_OPEN !== '1') {
    spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  }
});
