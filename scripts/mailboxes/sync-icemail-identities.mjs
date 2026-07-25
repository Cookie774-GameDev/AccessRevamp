import { createClient } from '@supabase/supabase-js';

const baseUrl = 'https://app.icemail.ai/api/v1';
const apiKey = String(process.env.ICEMAIL_API_KEY || '').trim();
const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!apiKey || !supabaseUrl || !serviceRoleKey) throw new Error('Icemail and Supabase service configuration is required.');

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const mailboxes = [];
for (let page = 1; page <= 10; page += 1) {
  const response = await fetch(`${baseUrl}/mailbox?page=${page}&limit=50`, {
    headers: { 'x-api-key': apiKey, accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Icemail mailbox list returned HTTP ${response.status}.`);
  const payload = await response.json();
  const pageRows = payload?.data?.mailboxes || [];
  mailboxes.push(...pageRows);
  if (mailboxes.length >= Number(payload?.data?.total_count || 0) || pageRows.length === 0) break;
}
if (mailboxes.length !== 100) throw new Error(`Expected 100 Icemail mailboxes; received ${mailboxes.length}.`);

for (const mailbox of mailboxes) {
  const address = String(mailbox.username || '').trim().toLowerCase();
  const providerId = String(mailbox.id || '').trim();
  if (!address || !providerId || mailbox.type !== 'AZURE' || mailbox.active !== true) {
    throw new Error('Icemail returned an unexpected mailbox identity or state.');
  }
  const { data, error } = await client
    .from('accessrevamp_mailboxes')
    .update({ provider_mailbox_id: providerId })
    .eq('address', address)
    .eq('provider', 'icemail_azure')
    .select('id');
  if (error || data?.length !== 1) throw new Error(`Could not match Icemail mailbox ${address}.`);
}

console.log(JSON.stringify({ synchronized: mailboxes.length, credentialsPrinted: false }));
