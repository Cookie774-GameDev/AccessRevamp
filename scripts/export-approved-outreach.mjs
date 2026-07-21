import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'node:fs/promises';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: settings, error: settingsError } = await supabase
  .from('outreach_settings')
  .select('daily_limit')
  .eq('singleton', true)
  .single();
if (settingsError) throw settingsError;

const configuredLimit = Number(settings?.daily_limit);
const exportLimit = Math.min(Math.max(Number.isInteger(configuredLimit) ? configuredLimit : 1, 1), 1000);
const { data, error } = await supabase
  .from('outreach_queue')
  .select('id,recipient_email,subject,body_text,opt_out_token,prospects(business_name,website_url,contact_source_url)')
  .eq('status', 'approved')
  .order('created_at', { ascending: true })
  .limit(exportLimit);
if (error) throw error;

const quote = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const rows = [['queue_id','business_name','website_url','contact_source_url','recipient_email','subject','body_text','opt_out_token']];
for (const item of data || []) {
  rows.push([
    item.id,
    item.prospects?.business_name,
    item.prospects?.website_url,
    item.prospects?.contact_source_url,
    item.recipient_email,
    item.subject,
    item.body_text,
    item.opt_out_token,
  ]);
}

const csv = rows.map((row) => row.map(quote).join(',')).join('\n') + '\n';
const output = process.argv[2] || 'approved-outreach.csv';
await writeFile(output, csv, 'utf8');
console.log(`Exported ${Math.max(rows.length - 1, 0)} approved rows to ${output} using the configured daily ceiling of ${exportLimit}. No email was sent.`);
