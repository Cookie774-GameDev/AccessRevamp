import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { loadMailboxMcpConfig } from '../tools/mailbox-mcp/config.mjs';
import {
  createGraphMailboxClient,
  sanitizeGraphMessage,
} from '../tools/mailbox-mcp/graph-client.mjs';
import { normalizeIcemailDomainMailbox } from '../tools/mailbox-mcp/icemail-client.mjs';
import {
  buildMailboxMcpServer,
  MAILBOX_TOOL_NAMES,
} from '../tools/mailbox-mcp/server.mjs';

const rootFile = (path) => readFile(path, 'utf8');

test('mailbox MCP defaults to read-only draft controls', () => {
  const config = loadMailboxMcpConfig({});
  assert.equal(config.draftWritesEnabled, false);
  assert.equal(config.messageStateWritesEnabled, false);
  assert.equal(config.icemailInventorySyncEnabled, false);
  assert.equal(config.maximumSearchResults, 25);
  assert.equal(config.maximumBodyCharacters, 20_000);
});

test('the exposed MCP surface has no send or warm-up tool', () => {
  assert.ok(MAILBOX_TOOL_NAMES.includes('search_messages'));
  assert.ok(MAILBOX_TOOL_NAMES.includes('read_message'));
  assert.ok(MAILBOX_TOOL_NAMES.includes('create_reply_draft'));
  assert.ok(MAILBOX_TOOL_NAMES.includes('update_reply_draft'));
  assert.ok(MAILBOX_TOOL_NAMES.includes('set_message_read_state'));
  assert.ok(!MAILBOX_TOOL_NAMES.some((name) => /send|warmup|not_spam/i.test(name)));
});

test('an MCP client can initialize, list the exact tools, and read capacity', async () => {
  const config = loadMailboxMcpConfig({});
  const repository = {
    getCapacity: async () => ({ configured_mailbox_count: 100, effective_cold_daily_cap: 0 }),
    listMailboxes: async () => [],
    audit: async () => undefined,
    requireMailboxAccess: async () => { throw new Error('not used'); },
    upsertIcemailInventory: async () => [],
  };
  const graphClient = {
    searchMessages: async () => [],
    readMessage: async () => ({}),
    createReplyDraft: async () => ({}),
    updateReplyDraft: async () => ({}),
    setMessageReadState: async () => ({}),
  };
  const server = buildMailboxMcpServer({
    config,
    repository,
    graphClient,
    icemailClientFactory: () => ({ loadMicrosoftInventory: async () => [] }),
  });
  const client = new Client({ name: 'mailbox-test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(({ name }) => name).sort(), [...MAILBOX_TOOL_NAMES].sort());
    const result = await client.callTool({ name: 'mailbox_capacity', arguments: {} });
    assert.equal(result.isError, undefined);
    assert.match(result.content[0].text, /"configured_mailbox_count": 100/);
  } finally {
    await client.close();
    await server.close();
  }
});

test('Icemail inventory normalization excludes credentials and recovery data', () => {
  const normalized = normalizeIcemailDomainMailbox({
    id: 'mbx-1',
    username: 'Owner@Example.com',
    domain_id: 'dom-1',
    status: 'ACTIVE',
    active: true,
    warmup_duration: 14,
    password: 'must-not-escape',
    app_password: 'must-not-escape',
    recovery_email: 'private@example.net',
    forward_email: 'private@example.net',
  }, { domain: 'example.com' });

  assert.deepEqual(normalized, {
    providerMailboxId: 'mbx-1',
    address: 'owner@example.com',
    domain: 'example.com',
    providerStatus: 'ACTIVE',
    status: 'active',
    active: true,
    warmupDurationDays: 14,
  });
  assert.doesNotMatch(JSON.stringify(normalized), /password|recovery|forward/i);
});

test('Graph message sanitizer returns text without provider internals', () => {
  const message = sanitizeGraphMessage({
    id: 'message-1',
    subject: 'Hello',
    body: { contentType: 'html', content: '<p>Hello</p>' },
    bodyPreview: 'Hello',
    from: { emailAddress: { name: 'Sender', address: 'sender@example.com' } },
    toRecipients: [{ emailAddress: { address: 'owner@example.com' } }],
    internetMessageHeaders: [{ name: 'Authentication-Results', value: 'private' }],
  }, 1000);

  assert.equal(message.id, 'message-1');
  assert.equal(message.bodyText, '<p>Hello</p>');
  assert.equal(message.from.address, 'sender@example.com');
  assert.equal('internetMessageHeaders' in message, false);
});

test('Graph search keeps exactly one API version segment', async () => {
  const calls = [];
  const client = createGraphMailboxClient({
    credential: { getToken: async () => ({ token: 'test-token' }) },
    fetchImpl: async (url) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ value: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  await client.searchMessages({ mailbox: 'owner@example.com', query: 'invoice' });
  assert.match(calls[0], /\/v1\.0\/users\/owner%40example\.com\/messages\?/);
  assert.doesNotMatch(calls[0], /\/v1\.0\/v1\.0\//);
});

test('reply drafting uses createReply and PATCH, never sendMail', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body });
    if (String(url).endsWith('/createReply')) {
      return new Response(JSON.stringify({
        id: 'draft-1',
        isDraft: true,
        subject: 'RE: Hello',
        webLink: 'https://outlook.office.com/mail/draft-1',
      }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      id: 'draft-1',
      isDraft: true,
      subject: 'RE: Hello',
      webLink: 'https://outlook.office.com/mail/draft-1',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const client = createGraphMailboxClient({
    credential: { getToken: async () => ({ token: 'test-token' }) },
    fetchImpl,
  });

  const result = await client.createReplyDraft({
    mailbox: 'owner@example.com',
    messageId: 'message-1',
    bodyText: 'Thanks for your message.',
  });

  assert.equal(result.id, 'draft-1');
  assert.deepEqual(calls.map(({ method }) => method), ['POST', 'PATCH']);
  assert.match(calls[0].url, /\/users\/owner%40example\.com\/messages\/message-1\/createReply$/);
  assert.match(calls[1].url, /\/users\/owner%40example\.com\/messages\/draft-1$/);
  assert.ok(!calls.some(({ url }) => /sendMail|\/send$/i.test(url)));
});

test('mailbox migration adds authorization without credential columns', async () => {
  const migration = await rootFile('supabase/migrations/20260722130000_mailbox_mcp_control_plane.sql');
  assert.match(migration, /read_authorized boolean not null default false/);
  assert.match(migration, /draft_authorized boolean not null default false/);
  assert.match(migration, /provider_mailbox_id text/);
  assert.match(migration, /accessrevamp_mailbox_sync_state/);
  assert.match(migration, /enable row level security/);
  assert.doesNotMatch(migration, /add column[^;]*(password|client_secret|access_token|refresh_token)/i);
});

test('source and configuration never add a send-mail capability', async () => {
  const [server, graph, packageJson] = await Promise.all([
    rootFile('tools/mailbox-mcp/server.mjs'),
    rootFile('tools/mailbox-mcp/graph-client.mjs'),
    rootFile('package.json'),
  ]);
  assert.doesNotMatch(`${server}\n${graph}`, /sendMail|messages\.send|smtp/i);
  assert.match(packageJson, /"mailbox:mcp"/);
});
