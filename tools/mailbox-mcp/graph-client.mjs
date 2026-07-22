import {
  ClientCertificateCredential,
  ClientSecretCredential,
} from '@azure/identity';

const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';
const MESSAGE_FIELDS = [
  'id', 'conversationId', 'internetMessageId', 'subject', 'body', 'bodyPreview',
  'from', 'toRecipients', 'ccRecipients', 'receivedDateTime', 'sentDateTime',
  'isRead', 'isDraft', 'webLink', 'hasAttachments',
].join(',');

const clean = (value) => String(value ?? '').trim();
const truncate = (value, maximum) => {
  const text = String(value ?? '');
  return text.length <= maximum ? text : `${text.slice(0, maximum)}\n[truncated]`;
};

const normalizeMailboxAddress = (value) => {
  const address = clean(value).toLowerCase();
  if (!address || !address.includes('@') || /[\r\n]/.test(address)) {
    throw new Error('A valid mailbox address is required.');
  }
  return address;
};

const encodeSegment = (value, label) => {
  const cleaned = clean(value);
  if (!cleaned || /[\r\n]/.test(cleaned)) throw new Error(`${label} is required.`);
  return encodeURIComponent(cleaned);
};
const cleanAddress = (entry) => {
  const email = entry?.emailAddress;
  if (!email?.address) return null;
  return {
    name: clean(email.name) || null,
    address: clean(email.address).toLowerCase(),
  };
};

const cleanRecipients = (entries) => (Array.isArray(entries) ? entries : [])
  .map(cleanAddress)
  .filter(Boolean);

export function sanitizeGraphMessage(message, maximumBodyCharacters = 20_000) {
  return {
    id: clean(message?.id),
    conversationId: clean(message?.conversationId) || null,
    internetMessageId: clean(message?.internetMessageId) || null,
    subject: clean(message?.subject) || '(no subject)',
    bodyPreview: truncate(message?.bodyPreview, Math.min(maximumBodyCharacters, 2_000)),
    bodyText: truncate(message?.body?.content ?? message?.bodyPreview, maximumBodyCharacters),
    bodyContentType: clean(message?.body?.contentType).toLowerCase() || 'text',
    from: cleanAddress(message?.from),
    toRecipients: cleanRecipients(message?.toRecipients),
    ccRecipients: cleanRecipients(message?.ccRecipients),
    receivedDateTime: clean(message?.receivedDateTime) || null,
    sentDateTime: clean(message?.sentDateTime) || null,
    isRead: Boolean(message?.isRead),
    isDraft: Boolean(message?.isDraft),
    hasAttachments: Boolean(message?.hasAttachments),
    webLink: clean(message?.webLink) || null,
  };
}
export function createGraphCredential(config) {
  if (config.graphCertificatePath) {
    return new ClientCertificateCredential(
      config.graphTenantId,
      config.graphClientId,
      config.graphCertificatePath,
    );
  }
  return new ClientSecretCredential(
    config.graphTenantId,
    config.graphClientId,
    config.graphClientSecret,
  );
}

const responsePayload = async (response) => {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: truncate(text, 2_000) };
  }
};

const graphError = (response, payload) => {
  const providerMessage = clean(payload?.error?.message) || clean(payload?.raw);
  const requestId = response.headers.get('request-id') || response.headers.get('client-request-id');
  const suffix = requestId ? ` Request ID: ${requestId}.` : '';
  return new Error(`Microsoft Graph request failed (${response.status}).${providerMessage ? ` ${providerMessage}` : ''}${suffix}`);
};
export function createGraphMailboxClient({
  config = {},
  credential = createGraphCredential(config),
  fetchImpl = globalThis.fetch,
} = {}) {
  const baseUrl = clean(config.graphBaseUrl) || 'https://graph.microsoft.com/v1.0';
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');

  const request = async (path, { method = 'GET', body, preferText = false } = {}) => {
    const accessToken = await credential.getToken(GRAPH_SCOPE);
    if (!accessToken?.token) throw new Error('Microsoft Graph authentication returned no token.');
    const headers = {
      authorization: `Bearer ${accessToken.token}`,
      accept: 'application/json',
      'client-request-id': crypto.randomUUID(),
    };
    if (preferText) headers.prefer = 'outlook.body-content-type="text"';
    if (body !== undefined) headers['content-type'] = 'application/json';

    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await responsePayload(response);
    if (!response.ok) throw graphError(response, payload);
    return payload;
  };

  const userPath = (mailbox) => `/users/${encodeURIComponent(normalizeMailboxAddress(mailbox))}`;
  const messagePath = (mailbox, messageId) =>
    `${userPath(mailbox)}/messages/${encodeSegment(messageId, 'Message ID')}`;
  return Object.freeze({
    async searchMessages({ mailbox, query, limit = 25, maximumBodyCharacters = 20_000 }) {
      const search = clean(query).replace(/["\\\r\n]+/g, ' ').replace(/\s+/g, ' ').slice(0, 200);
      if (!search) throw new Error('A non-empty message search is required.');
      const parameters = new URLSearchParams();
      parameters.set('$search', `"${search}"`);
      parameters.set('$top', String(Math.min(50, Math.max(1, limit))));
      parameters.set('$select', MESSAGE_FIELDS);
      const path = `${userPath(mailbox)}/messages?${parameters.toString()}`;
      const result = await request(path, { preferText: true });
      return (Array.isArray(result?.value) ? result.value : [])
        .map((message) => sanitizeGraphMessage(message, maximumBodyCharacters));
    },

    async readMessage({ mailbox, messageId, maximumBodyCharacters = 20_000 }) {
      const path = `${messagePath(mailbox, messageId)}?$select=${encodeURIComponent(MESSAGE_FIELDS)}`;
      const message = await request(path, { preferText: true });
      return sanitizeGraphMessage(message, maximumBodyCharacters);
    },

    async createReplyDraft({ mailbox, messageId, bodyText }) {
      const draft = await request(`${messagePath(mailbox, messageId)}/createReply`, {
        method: 'POST',
        body: {},
        preferText: true,
      });
      if (!draft?.id || !draft.isDraft) throw new Error('Provider did not return a reply draft.');
      const updated = await request(messagePath(mailbox, draft.id), {
        method: 'PATCH',
        body: { body: { contentType: 'Text', content: clean(bodyText) } },
        preferText: true,
      });
      return sanitizeGraphMessage(updated || draft, 20_000);
    },

    async updateReplyDraft({ mailbox, draftId, bodyText }) {
      const existing = await request(
        `${messagePath(mailbox, draftId)}?$select=${encodeURIComponent(MESSAGE_FIELDS)}`,
        { preferText: true },
      );
      if (!existing?.isDraft) throw new Error('The selected message is not an editable draft.');
      const updated = await request(messagePath(mailbox, draftId), {
        method: 'PATCH',
        body: { body: { contentType: 'Text', content: clean(bodyText) } },
        preferText: true,
      });
      return sanitizeGraphMessage(updated || existing, 20_000);
    },

    async setMessageReadState({ mailbox, messageId, isRead }) {
      const updated = await request(messagePath(mailbox, messageId), {
        method: 'PATCH',
        body: { isRead: Boolean(isRead) },
        preferText: true,
      });
      return sanitizeGraphMessage(updated, 2_000);
    },
  });
}
