import { createClient } from '@supabase/supabase-js';
import { loadWorker6Config } from './config.mjs';
import { createGmailImap } from './gmail-imap.mjs';
import { createIcemailSmtp } from './icemail-smtp.mjs';
import { createSupportSmtp } from './support-smtp.mjs';

const config = loadWorker6Config(process.env);
const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: mailbox, error } = await client
  .from('accessrevamp_mailboxes')
  .select('address,provider_mailbox_id')
  .eq('provider', 'icemail_azure')
  .eq('status', 'active')
  .not('provider_mailbox_id', 'is', null)
  .order('address')
  .limit(1)
  .single();
if (error || !mailbox) throw new Error(`Mailbox verification target unavailable: ${error?.message || 'missing row'}`);

await createGmailImap(config).verify();
await createSupportSmtp(config.support).verify();
await createIcemailSmtp({ apiKey: config.icemailApiKey }).verifyMailbox({
  mailboxAddress: mailbox.address,
  providerMailboxId: mailbox.provider_mailbox_id,
});

process.stdout.write(`${JSON.stringify({
  readerImap: true,
  supportSmtp: true,
  icemailAzureSmtp: true,
  messagesSent: 0,
  secretsPrinted: false,
})}\n`);
