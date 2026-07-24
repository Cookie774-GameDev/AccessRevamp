import { createClient } from '@supabase/supabase-js';

export function createWorker6Repository(config) {
  const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const fail = (result, label) => {
    if (result.error) throw new Error(`${label}: ${result.error.message}`);
    return result.data;
  };
  return {
    async startRun() {
      return fail(await client.from('inbound_email_worker_runs').insert({ outcome: 'running' }).select('id').single(), 'start run').id;
    },
    async finishRun(id, counters, error = null) {
      fail(await client.from('inbound_email_worker_runs').update({
        finished_at: new Date().toISOString(),
        outcome: error ? 'failed' : 'succeeded',
        message_count: counters.messagesSeen,
        inserted_count: counters.inserted,
        draft_count: counters.draftsCreated,
        safe_error: error ? String(error.message || error).slice(0, 500) : null,
      }).eq('id', id), 'finish run');
    },
    async findMatches(message) {
      const rows = fail(await client.rpc('find_accessrevamp_inbound_matches', {
        p_sender_email: message.from,
        p_in_reply_to: message.inReplyTo || null,
      }), 'find message match') || [];
      return rows.map((row) => ({ ownerKey: row.owner_key, threadId: row.thread_id, mailboxId: row.mailbox_id }));
    },
    async record(message, route, context) {
      const data = fail(await client.rpc('record_accessrevamp_inbound_email', {
        p_gmail_message_id: message.gmailMessageId,
        p_gmail_thread_id: message.gmailThreadId || null,
        p_sender_email: message.from,
        p_recipient_emails: message.to,
        p_subject: message.subject || null,
        p_body_text: message.text || '',
        p_received_at: message.receivedAt,
        p_in_reply_to: message.inReplyTo || null,
        p_assignment_kind: route.kind,
        p_owner_key: route.ownerKey || null,
        p_context: context,
      }), 'record inbound email');
      return data;
    },
    async complete(assignmentId, state, draftId = null, reason = null) {
      fail(await client.rpc('complete_accessrevamp_inbound_assignment', {
        p_assignment_id: assignmentId,
        p_state: state,
        p_gmail_draft_id: draftId,
        p_failure_reason: reason,
      }), 'complete assignment');
    },
  };
}
