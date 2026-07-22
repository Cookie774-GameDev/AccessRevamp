const truthy = new Set(['1', 'true', 'yes', 'on']);

const readBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return truthy.has(String(value).trim().toLowerCase());
};

const readInteger = (value, fallback, minimum, maximum) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
};

const clean = (value) => String(value ?? '').trim();

export function loadMailboxMcpConfig(env = process.env) {
  return Object.freeze({
    supabaseUrl: clean(env.SUPABASE_URL),
    supabaseServiceRoleKey: clean(env.SUPABASE_SERVICE_ROLE_KEY),
    graphTenantId: clean(env.ACCESSREVAMP_GRAPH_TENANT_ID),
    graphClientId: clean(env.ACCESSREVAMP_GRAPH_CLIENT_ID),
    graphClientSecret: clean(env.ACCESSREVAMP_GRAPH_CLIENT_SECRET),
    graphCertificatePath: clean(env.ACCESSREVAMP_GRAPH_CERTIFICATE_PATH),
    graphBaseUrl: clean(env.ACCESSREVAMP_GRAPH_BASE_URL) || 'https://graph.microsoft.com/v1.0',
    icemailApiBaseUrl: clean(env.ICEMAIL_API_BASE_URL) || 'https://app.icemail.ai/api/v1',
    icemailApiKey: clean(env.ICEMAIL_API_KEY),
    draftWritesEnabled: readBoolean(env.ACCESSREVAMP_MAILBOX_DRAFT_WRITES_ENABLED),
    messageStateWritesEnabled: readBoolean(env.ACCESSREVAMP_MESSAGE_STATE_WRITES_ENABLED),
    icemailInventorySyncEnabled: readBoolean(env.ACCESSREVAMP_ICEMAIL_INVENTORY_SYNC_ENABLED),
    maximumSearchResults: readInteger(env.ACCESSREVAMP_MAILBOX_MAX_SEARCH_RESULTS, 25, 1, 50),
    maximumBodyCharacters: readInteger(env.ACCESSREVAMP_MAILBOX_MAX_BODY_CHARACTERS, 20_000, 1_000, 100_000),
    operatorLabel: clean(env.ACCESSREVAMP_MAILBOX_OPERATOR_LABEL) || 'accessrevamp-mailbox-mcp',
  });
}

export function assertSupabaseConfig(config) {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
}

export function assertGraphConfig(config) {
  if (!config.graphTenantId || !config.graphClientId) {
    throw new Error('Microsoft Graph tenant and client identifiers are required.');
  }
  if (!config.graphCertificatePath && !config.graphClientSecret) {
    throw new Error('A Graph certificate path or development client secret is required.');
  }
}

export function assertIcemailConfig(config) {
  if (!config.icemailApiKey) {
    throw new Error('ICEMAIL_API_KEY is required for inventory synchronization.');
  }
}
