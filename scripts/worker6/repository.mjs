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
      return rows.map((row) => ({
        ownerKey: row.owner_key,
        threadId: row.thread_id,
        mailboxId: row.mailbox_id,
        mailboxAddress: row.mailbox_address,
        providerMailboxId: row.provider_mailbox_id,
      }));
    },
    async loadThread(route) {
      if (route.kind !== 'inbox_owner' || !route.threadId) return [];
      const rows = fail(await client
        .from('accessrevamp_messages')
        .select('direction,message_kind,subject,body_text,status,sent_at,received_at,created_at')
        .eq('thread_id', route.threadId)
        .order('created_at', { ascending: false })
        .limit(20), 'load reply thread') || [];
      return rows.reverse().map((row) => ({
        direction: row.direction,
        kind: row.message_kind,
        subject: row.subject,
        body: row.body_text,
        status: row.status,
        at: row.sent_at || row.received_at || row.created_at,
      }));
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
    async claim(assignmentId, ownerKey) {
      return fail(await client.rpc('claim_accessrevamp_inbound_assignment', {
        p_assignment_id: assignmentId,
        p_owner_key: ownerKey || 'worker6:support',
      }), 'claim inbound assignment');
    },
    async reserveReply(assignmentId) {
      return fail(await client.rpc('reserve_accessrevamp_reply_send', {
        p_assignment_id: assignmentId,
      }), 'reserve reply send');
    },
    async recordSentReply(assignmentId, message) {
      return fail(await client.rpc('record_accessrevamp_sent_reply', {
        p_assignment_id: assignmentId,
        p_provider_message_id: message.providerMessageId,
        p_subject: message.subject,
        p_body_text: message.body,
      }), 'record sent reply');
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
