import { createHmac } from 'node:crypto';
import { handleError, html, json } from './_shared/http.mjs';
import { readUnsubscribeToken } from './_shared/secure-tokens.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const page = (title, message) => '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex,nofollow"><title>' + title + '</title><style>body{margin:0;background:#07111f;color:#eef5fb;font:16px/1.6 system-ui;min-height:100vh;display:grid;place-items:center;padding:20px}.card{max-width:580px;border:1px solid #294056;border-radius:22px;padding:36px;background:#0d1b2a}h1{letter-spacing:-.04em}p{color:#b8c7d5}a{color:#63e6d4}</style><main class="card"><h1>' + title + '</h1><p>' + message + '</p><a href="/">Return to AccessRevamp</a></main></html>';

export default async (request) => {
  try {
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
    const token = request.method === 'GET'
      ? new URL(request.url).searchParams.get('token')
      : (await request.json()).token;

    let payload;
    try {
      payload = readUnsubscribeToken(token);
    } catch {
      return request.method === 'GET'
        ? html(page('Invalid opt-out link', 'This opt-out link is incomplete or invalid.'), 400, { 'x-robots-tag': 'noindex, nofollow' })
        : json({ error: 'Invalid token.' }, 400);
    }

    const messageId = String(payload.messageId || '');
    const email = String(payload.email || '').trim().toLowerCase();
    if (!/^[0-9a-f-]{36}$/i.test(messageId) || !email.includes('@') || email.length > 254) {
      return request.method === 'GET'
        ? html(page('Invalid opt-out link', 'This opt-out link is incomplete or invalid.'), 400, { 'x-robots-tag': 'noindex, nofollow' })
        : json({ error: 'Invalid token.' }, 400);
    }

    const supabase = getSupabaseAdmin();
    const { data: item, error: lookupError } = await supabase
      .from('ar_outreach_messages')
      .select('id,prospect_id,contact_email')
      .eq('id', messageId)
      .ilike('contact_email', email)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!item) {
      return request.method === 'GET'
        ? html(page('Opt-out link not found', 'Reply to the original message with “unsubscribe” and the address will be suppressed manually.'), 404, { 'x-robots-tag': 'noindex, nofollow' })
        : json({ error: 'Token not found.' }, 404);
    }

    const secret = process.env.UNSUBSCRIBE_SECRET;
    if (!secret || secret.length < 32) throw new Error('UNSUBSCRIBE_SECRET is not configured.');
    const domain = email.split('@').pop();
    const emailHash = createHmac('sha256', secret).update(email).digest('hex');
    const { error: suppressionError } = await supabase
      .from('ar_suppression_list')
      .upsert({
        normalized_email: email,
        email_hash: emailHash,
        domain,
        scope: 'email',
        reason: 'recipient_opt_out',
        source: 'one_click_link',
      }, { onConflict: 'normalized_email' });
    if (suppressionError) throw suppressionError;

    const now = new Date().toISOString();
    const { error: messageError } = await supabase
      .from('ar_outreach_messages')
      .update({ status: 'opted_out', opted_out_at: now })
      .ilike('contact_email', email)
      .in('status', ['draft', 'approved', 'queued', 'sent']);
    if (messageError) throw messageError;

    if (item.prospect_id) {
      const { error: prospectError } = await supabase
        .from('ar_prospects')
        .update({ status: 'suppressed' })
        .eq('id', item.prospect_id);
      if (prospectError) throw prospectError;
    }

    return request.method === 'GET'
      ? html(page('You are opted out', 'This address has been added to the permanent AccessRevamp suppression list. No further outreach should be sent to it.'), 200, { 'x-robots-tag': 'noindex, nofollow' })
      : json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
};
