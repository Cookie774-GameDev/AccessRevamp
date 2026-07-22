import { createHash, randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const [projectId, purpose, taskId = '', hoursText = '72'] = process.argv.slice(2);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const purposes = new Set(['homepage_selection', 'revision_selection', 'cinematic_sequence_selection', 'scene_selection', 'final_approval', 'portfolio_consent']);

if (!uuid.test(projectId || '') || !purposes.has(purpose || '')) {
  throw new Error('Usage: node scripts/issue-project-approval-link.mjs <project-uuid> <purpose> [task-uuid] [hours]');
}
if (taskId && !uuid.test(taskId)) throw new Error('Task ID must be a UUID.');

const hours = Number(hoursText);
if (!Number.isInteger(hours) || hours < 1 || hours > 168) throw new Error('Expiry hours must be between 1 and 168.');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = String(process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');
if (!url || !key || !/^https:\/\//.test(siteUrl)) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and HTTPS SITE_URL are required.');
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-application-name': 'accessrevamp-approval-link-issuer' } },
});

const { data: project, error: projectError } = await supabase
  .from('customer_projects')
  .select('id')
  .eq('id', projectId)
  .single();
if (projectError || !project) throw new Error('Customer project was not found.');

if (taskId) {
  const { data: task, error: taskError } = await supabase
    .from('project_workflow_tasks')
    .select('id,workflow_id,project_workflows!inner(project_id)')
    .eq('id', taskId)
    .single();
  if (taskError || !task || task.project_workflows?.project_id !== projectId) {
    throw new Error('Workflow task does not belong to the project.');
  }
}

await supabase
  .from('project_approval_links')
  .update({ status: 'revoked', updated_at: new Date().toISOString() })
  .eq('project_id', projectId)
  .eq('purpose', purpose)
  .eq('status', 'active');

const token = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(token).digest('hex');
const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
const inserted = await supabase.from('project_approval_links').insert({
  project_id: projectId,
  task_id: taskId || null,
  purpose,
  token_hash: tokenHash,
  status: 'active',
  expires_at: expiresAt,
}).select('id').single();
if (inserted.error) throw inserted.error;

console.log(JSON.stringify({
  approvalLinkId: inserted.data.id,
  purpose,
  expiresAt,
  url: `${siteUrl}/approve/${token}`,
}, null, 2));
console.error('The raw token is shown once and is never stored. Deliver the URL only to the intended customer.');
