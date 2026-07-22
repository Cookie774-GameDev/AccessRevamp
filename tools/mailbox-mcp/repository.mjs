import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const clean = (value) => String(value ?? '').trim();
const normalizeAddress = (value) => clean(value).toLowerCase();

const MAILBOX_FIELDS = [
  'id', 'address', 'provider', 'domain', 'status', 'health_score',
  'provider_domain_id', 'provider_mailbox_id', 'provider_status', 'graph_user_id',
  'read_authorized', 'draft_authorized', 'message_state_write_authorized',
  'reply_handling_authorized', 'outbound_authorized', 'inventory_sync_enabled',
  'last_inventory_sync_at', 'last_health_check_at', 'last_error', 'updated_at',
].join(',');

export const hashText = (value) => createHash('sha256')
  .update(String(value ?? ''), 'utf8')
  .digest('hex');

export function createMailboxRepository({ config = {}, client } = {}) {
  const supabase = client || createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-application-name': 'accessrevamp-mailbox-mcp' } },
    },
  );

  const assertResult = ({ data, error }, label) => {
    if (error) throw new Error(`${label}: ${error.message}`);
    return data;
  };
  const getMailbox = async (address) => {
    const result = await supabase
      .from('accessrevamp_mailboxes')
      .select(MAILBOX_FIELDS)
      .eq('address', normalizeAddress(address))
      .maybeSingle();
    const mailbox = assertResult(result, 'Mailbox lookup failed');
    if (!mailbox) throw new Error('Mailbox is not registered in AccessRevamp.');
    return mailbox;
  };

  const requireMailboxAccess = async (address, capability = 'read') => {
    const mailbox = await getMailbox(address);
    if (mailbox.status !== 'active') throw new Error('Mailbox is not active.');
    if (!mailbox.read_authorized) throw new Error('Mailbox read access is not authorized.');
    if (capability === 'draft'
      && (!mailbox.draft_authorized || !mailbox.reply_handling_authorized)) {
      throw new Error('Mailbox reply-draft access is not authorized.');
    }
    if (capability === 'message_state' && !mailbox.message_state_write_authorized) {
      throw new Error('Mailbox message-state updates are not authorized.');
    }
    return {
      ...mailbox,
      graphPrincipal: clean(mailbox.graph_user_id) || mailbox.address,
    };
  };

  const audit = async ({ action, entityType, entityId, details = {} }) => {
    const result = await supabase.from('accessrevamp_audit_log').insert({
      actor_id: null,
      action: clean(action).slice(0, 160),
      entity_type: clean(entityType).slice(0, 160),
      entity_id: clean(entityId).slice(0, 500) || null,
      details,
    });
    assertResult(result, 'Audit write failed');
  };
  return Object.freeze({
    getMailbox,
    requireMailboxAccess,
    audit,

    async getCapacity() {
      const result = await supabase.rpc('accessrevamp_mailbox_capacity');
      const data = assertResult(result, 'Mailbox capacity lookup failed');
      return Array.isArray(data) ? data[0] ?? null : data;
    },

    async listMailboxes({ status, limit = 100 } = {}) {
      let query = supabase
        .from('accessrevamp_mailboxes')
        .select(MAILBOX_FIELDS)
        .order('address', { ascending: true })
        .limit(Math.min(100, Math.max(1, limit)));
      if (status) query = query.eq('status', status);
      return assertResult(await query, 'Mailbox list failed') || [];
    },

    async upsertIcemailInventory(records) {
      if (!Array.isArray(records) || records.length === 0) return [];
      if (records.length > 1_000) throw new Error('Icemail inventory batch is too large.');
      const syncedAt = new Date().toISOString();
      const rows = records.map((item) => ({
        address: normalizeAddress(item.address),
        domain: clean(item.domain).toLowerCase(),
        provider: 'icemail_azure',
        status: item.status,
        provider_domain_id: clean(item.providerDomainId) || null,
        provider_mailbox_id: clean(item.providerMailboxId) || null,
        provider_status: clean(item.providerStatus) || null,
        inventory_sync_enabled: true,
        last_inventory_sync_at: syncedAt,
        updated_at: syncedAt,
      }));
      const result = await supabase
        .from('accessrevamp_mailboxes')
        .upsert(rows, { onConflict: 'address' })
        .select(MAILBOX_FIELDS);
      const saved = assertResult(result, 'Icemail inventory upsert failed') || [];
      await audit({
        action: 'mailbox.inventory_synced',
        entityType: 'mailbox_inventory',
        entityId: 'icemail',
        details: {
          count: saved.length,
          addressesSha256: hashText(saved.map((item) => item.address).sort().join('\n')),
        },
      });
      return saved;
    },
  });
}
