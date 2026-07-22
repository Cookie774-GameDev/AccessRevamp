const clean = (value) => String(value ?? '').trim();
const upper = (value) => clean(value).toUpperCase();

const operationalStatus = (mailbox) => {
  const status = upper(mailbox?.status);
  if (Boolean(mailbox?.active) && status === 'ACTIVE') return 'active';
  if (status.includes('WARM')) return 'warming';
  if (status === 'PENDING' || status === 'CREATING') return 'pending';
  if (status === 'DISABLED' || status === 'DELETED') return 'disabled';
  if (status === 'PAUSED') return 'paused';
  return 'degraded';
};

export function normalizeIcemailDomainMailbox(mailbox, domainRecord = {}) {
  const address = clean(mailbox?.username).toLowerCase();
  const domain = clean(domainRecord?.domain || address.split('@')[1]).toLowerCase();
  if (!address.includes('@') || !domain) throw new Error('Icemail returned an invalid mailbox address.');
  return {
    providerMailboxId: clean(mailbox?.id),
    address,
    domain,
    providerStatus: upper(mailbox?.status) || null,
    status: operationalStatus(mailbox),
    active: Boolean(mailbox?.active),
    warmupDurationDays: Number.isInteger(mailbox?.warmup_duration)
      ? mailbox.warmup_duration
      : null,
  };
}
const responseJson = async (response) => {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok || payload?.success === false) {
    const providerMessage = clean(payload?.message);
    throw new Error(`Icemail request failed (${response.status}).${providerMessage ? ` ${providerMessage}` : ''}`);
  }
  return payload;
};

export function createIcemailClient({
  apiBaseUrl = 'https://app.icemail.ai/api/v1',
  apiKey,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!clean(apiKey)) throw new Error('An Icemail API key is required.');
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');
  const baseUrl = apiBaseUrl.replace(/\/$/, '');

  const get = async (path, parameters = {}) => {
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(parameters)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { accept: 'application/json', 'x-api-key': apiKey },
    });
    return responseJson(response);
  };

  const listDomains = async () => {
    const domains = [];
    for (let page = 1; page <= 20; page += 1) {
      const payload = await get('/domain', { page, limit: 50 });
      const batch = Array.isArray(payload?.data?.domains) ? payload.data.domains : [];
      domains.push(...batch);
      const total = Number(payload?.data?.total_count || 0);
      if (batch.length < 50 || (total > 0 && domains.length >= total)) break;
    }
    return domains;
  };

  const listDomainMailboxes = async (domainRecord) => {
    const domainId = clean(domainRecord?.domain_id);
    if (!domainId) throw new Error('Icemail domain identifier is missing.');
    const mailboxes = [];
    for (let page = 1; page <= 20; page += 1) {
      const payload = await get(`/mailbox/domain/${encodeURIComponent(domainId)}`, { page, limit: 50 });
      const batch = Array.isArray(payload?.data?.mailboxes) ? payload.data.mailboxes : [];
      mailboxes.push(...batch.map((item) => normalizeIcemailDomainMailbox(item, domainRecord)));
      if (batch.length < 50) break;
    }
    return mailboxes;
  };
  return Object.freeze({
    listDomains,
    listDomainMailboxes,
    async loadMicrosoftInventory({ domain } = {}) {
      const requestedDomain = clean(domain).toLowerCase();
      const domains = await listDomains();
      const candidates = domains.filter((item) => {
        if (requestedDomain && clean(item?.domain).toLowerCase() !== requestedDomain) return false;
        return upper(item?.workspace_type) === 'MICROSOFT'
          || Boolean(item?.associate_with_microsoft)
          || requestedDomain.length > 0;
      });
      const inventory = [];
      for (const item of candidates) {
        const mailboxes = await listDomainMailboxes(item);
        inventory.push(...mailboxes.map((mailbox) => ({
          ...mailbox,
          providerDomainId: clean(item?.domain_id),
        })));
      }
      return inventory;
    },
  });
}
