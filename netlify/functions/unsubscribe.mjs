import { handleError, html, json } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const page = (title, message) => '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' + title + '</title><style>body{margin:0;background:#07111f;color:#eef5fb;font:16px/1.6 system-ui;min-height:100vh;display:grid;place-items:center;padding:20px}.card{max-width:580px;border:1px solid #294056;border-radius:22px;padding:36px;background:#0d1b2a}h1{letter-spacing:-.04em}p{color:#b8c7d5}a{color:#63e6d4}</style><main class="card"><h1>' + title + '</h1><p>' + message + '</p><a href="/">Return to AccessRevamp</a></main></html>';

export default async (request) => {
  try {
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
    const token = request.method === 'GET'
      ? new URL(request.url).searchParams.get('token')
      : (await request.json()).token;
    if (!token || !/^[a-f0-9]{48}$/.test(token)) {
      return request.method === 'GET' ? html(page('Invalid opt-out link', 'This opt-out link is incomplete or invalid.'), 400) : json({ error: 'Invalid token.' }, 400);
    }
    const supabase = getSupabaseAdmin();
    const { data: item, error: lookupError } = await supabase.from('outreach_queue').select('recipient_email').eq('opt_out_token', token).maybeSingle();
    if (lookupError) throw lookupError;
    if (!item) return request.method === 'GET' ? html(page('Opt-out link not found', 'This link may already have expired. Reply to the original message with “unsubscribe” and the address will be suppressed manually.'), 404) : json({ error: 'Token not found.' }, 404);
    const { error } = await supabase.rpc('stop_accessrevamp_outreach', {
      p_email: item.recipient_email.toLowerCase(), p_reason: 'opt_out', p_operator_id: null,
    });
    if (error) throw error;
    return request.method === 'GET'
      ? html(page('You are opted out', 'This address has been added to the permanent AccessRevamp suppression list. No further outreach should be sent to it.'))
      : json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
};
