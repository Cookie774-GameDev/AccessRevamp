import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  assertGraphConfig,
  assertIcemailConfig,
  assertSupabaseConfig,
  loadMailboxMcpConfig,
} from './config.mjs';
import { createGraphCredential, createGraphMailboxClient } from './graph-client.mjs';
import { createIcemailClient } from './icemail-client.mjs';
import { createMailboxRepository, hashText } from './repository.mjs';

export const MAILBOX_TOOL_NAMES = Object.freeze([
  'mailbox_capacity',
  'list_mailboxes',
  'search_messages',
  'read_message',
  'create_reply_draft',
  'update_reply_draft',
  'set_message_read_state',
  'sync_icemail_inventory',
]);

const jsonResult = (value) => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  structuredContent: value,
});
const errorResult = (error) => ({
  isError: true,
  content: [{
    type: 'text',
    text: error instanceof Error ? error.message : 'Mailbox operation failed.',
  }],
});

const guarded = (handler) => async (input) => {
  try {
    return jsonResult(await handler(input));
  } catch (error) {
    return errorResult(error);
  }
};

const mailboxSchema = z.string().trim().email().max(320);
const messageIdSchema = z.string().trim().min(1).max(1_000);
const approvalSchema = z.string().trim().min(8).max(500);
const draftBodySchema = z.string().trim().min(1).max(20_000);

export function buildMailboxMcpServer({
  config,
  repository,
  graphClient,
  icemailClientFactory,
} = {}) {
  const server = new McpServer({
    name: 'accessrevamp-mailbox-control',
    version: '1.0.0',
  }, {
    instructions: 'Authorized mailbox reads and editable drafts only. Never expose credentials, process multiple mailboxes in one content call, or claim a draft was delivered. Draft and message-state tools require explicit approval and remain disabled by default.',
  });
  server.registerTool('mailbox_capacity', {
    title: 'AccessRevamp mailbox capacity',
    description: 'Report configured and actually authorized mailbox capacity. This never authorizes a message action.',
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, guarded(async () => ({
    capacity: await repository.getCapacity(),
    draftWritesEnabled: config.draftWritesEnabled,
    messageStateWritesEnabled: config.messageStateWritesEnabled,
    inventorySyncEnabled: config.icemailInventorySyncEnabled,
  })));

  server.registerTool('list_mailboxes', {
    title: 'List registered mailboxes',
    description: 'List service-role mailbox inventory and authorization state without returning credentials.',
    inputSchema: {
      status: z.enum(['pending', 'warming', 'active', 'paused', 'degraded', 'disabled']).optional(),
      limit: z.number().int().min(1).max(100).default(100),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, guarded(async ({ status, limit }) => {
    const mailboxes = await repository.listMailboxes({ status, limit });
    await repository.audit({
      action: 'mailbox.inventory_listed',
      entityType: 'mailbox_inventory',
      entityId: status || 'all',
      details: { count: mailboxes.length },
    });
    return { count: mailboxes.length, mailboxes };
  }));
  server.registerTool('search_messages', {
    title: 'Search one authorized mailbox',
    description: 'Search one registered mailbox. Results are limited and message bodies are truncated.',
    inputSchema: {
      mailbox: mailboxSchema,
      query: z.string().trim().min(1).max(200),
      limit: z.number().int().min(1).max(50).optional(),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, guarded(async ({ mailbox, query, limit }) => {
    const authorization = await repository.requireMailboxAccess(mailbox, 'read');
    const messages = await graphClient.searchMessages({
      mailbox: authorization.graphPrincipal,
      query,
      limit: Math.min(limit || config.maximumSearchResults, config.maximumSearchResults),
      maximumBodyCharacters: config.maximumBodyCharacters,
    });
    await repository.audit({
      action: 'mailbox.messages_searched',
      entityType: 'mailbox',
      entityId: authorization.id,
      details: { querySha256: hashText(query), resultCount: messages.length },
    });
    return { mailbox: authorization.address, count: messages.length, messages };
  }));

  server.registerTool('read_message', {
    title: 'Read one message',
    description: 'Read one message from one registered and authorized mailbox.',
    inputSchema: { mailbox: mailboxSchema, messageId: messageIdSchema },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, guarded(async ({ mailbox, messageId }) => {
    const authorization = await repository.requireMailboxAccess(mailbox, 'read');
    const message = await graphClient.readMessage({
      mailbox: authorization.graphPrincipal,
      messageId,
      maximumBodyCharacters: config.maximumBodyCharacters,
    });
    await repository.audit({
      action: 'mailbox.message_read',
      entityType: 'mailbox_message',
      entityId: message.id,
      details: { mailboxId: authorization.id, subjectSha256: hashText(message.subject) },
    });
    return { mailbox: authorization.address, message };
  }));

  server.registerTool('create_reply_draft', {
    title: 'Create a reply draft',
    description: 'Create and populate an editable reply draft without delivering it.',
    inputSchema: {
      mailbox: mailboxSchema,
      messageId: messageIdSchema,
      bodyText: draftBodySchema,
      approvalNote: approvalSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, guarded(async ({ mailbox, messageId, bodyText, approvalNote }) => {
    if (!config.draftWritesEnabled) throw new Error('Reply-draft writes are disabled.');
    const authorization = await repository.requireMailboxAccess(mailbox, 'draft');
    const draft = await graphClient.createReplyDraft({
      mailbox: authorization.graphPrincipal,
      messageId,
      bodyText,
    });
    await repository.audit({
      action: 'mailbox.reply_draft_created',
      entityType: 'mailbox_message',
      entityId: draft.id,
      details: {
        mailboxId: authorization.id,
        sourceMessageId: messageId,
        bodySha256: hashText(bodyText),
        bodyCharacters: bodyText.length,
        approvalNote,
      },
    });
    return { mailbox: authorization.address, draft };
  }));

  server.registerTool('update_reply_draft', {
    title: 'Update a reply draft',
    description: 'Replace the body of an existing editable reply draft.',
    inputSchema: {
      mailbox: mailboxSchema,
      draftId: messageIdSchema,
      bodyText: draftBodySchema,
      approvalNote: approvalSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  }, guarded(async ({ mailbox, draftId, bodyText, approvalNote }) => {
    if (!config.draftWritesEnabled) throw new Error('Reply-draft writes are disabled.');
    const authorization = await repository.requireMailboxAccess(mailbox, 'draft');
    const draft = await graphClient.updateReplyDraft({
      mailbox: authorization.graphPrincipal,
      draftId,
      bodyText,
    });
    await repository.audit({
      action: 'mailbox.reply_draft_updated',
      entityType: 'mailbox_message',
      entityId: draft.id,
      details: {
        mailboxId: authorization.id,
        bodySha256: hashText(bodyText),
        bodyCharacters: bodyText.length,
        approvalNote,
      },
    });
    return { mailbox: authorization.address, draft };
  }));

  server.registerTool('set_message_read_state', {
    title: 'Set message read state',
    description: 'Mark one message read or unread in an explicitly authorized mailbox.',
    inputSchema: {
      mailbox: mailboxSchema,
      messageId: messageIdSchema,
      isRead: z.boolean(),
      approvalNote: approvalSchema,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  }, guarded(async ({ mailbox, messageId, isRead, approvalNote }) => {
    if (!config.messageStateWritesEnabled) throw new Error('Message-state writes are disabled.');
    const authorization = await repository.requireMailboxAccess(mailbox, 'message_state');
    const message = await graphClient.setMessageReadState({
      mailbox: authorization.graphPrincipal,
      messageId,
      isRead,
    });
    await repository.audit({
      action: 'mailbox.message_state_updated',
      entityType: 'mailbox_message',
      entityId: message.id,
      details: { mailboxId: authorization.id, isRead, approvalNote },
    });
    return { mailbox: authorization.address, message };
  }));

  server.registerTool('sync_icemail_inventory', {
    title: 'Synchronize Icemail inventory',
    description: 'Import reduced mailbox inventory without credentials or access authorization.',
    inputSchema: {
      domain: z.string().trim().toLowerCase().max(253).optional(),
      confirmation: z.literal('SYNC ICEMAIL INVENTORY'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  }, guarded(async ({ domain }) => {
    if (!config.icemailInventorySyncEnabled) throw new Error('Icemail inventory sync is disabled.');
    const icemailClient = icemailClientFactory();
    const inventory = await icemailClient.loadMicrosoftInventory({ domain });
    const saved = await repository.upsertIcemailInventory(inventory);
    return {
      discovered: inventory.length,
      registered: saved.length,
      authorizationChanged: false,
      note: 'Imported mailboxes remain unauthorized until an operator grants access.',
    };
  }));

  return server;
}

export function createMailboxMcpRuntime(config = loadMailboxMcpConfig()) {
  assertSupabaseConfig(config);
  assertGraphConfig(config);
  const repository = createMailboxRepository({ config });
  const graphClient = createGraphMailboxClient({
    config,
    credential: createGraphCredential(config),
  });
  const icemailClientFactory = () => {
    assertIcemailConfig(config);
    return createIcemailClient({
      apiBaseUrl: config.icemailApiBaseUrl,
      apiKey: config.icemailApiKey,
    });
  };
  return {
    config,
    repository,
    graphClient,
    server: buildMailboxMcpServer({
      config,
      repository,
      graphClient,
      icemailClientFactory,
    }),
  };
}

export async function startMailboxMcpServer(config = loadMailboxMcpConfig()) {
  const runtime = createMailboxMcpRuntime(config);
  const transport = new StdioServerTransport();
  await runtime.server.connect(transport);
  console.error('AccessRevamp mailbox MCP is running on stdio.');
  console.error('Message delivery is not exposed by this server.');
}

const isMain = Boolean(process.argv[1])
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  startMailboxMcpServer().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Mailbox MCP failed to start.');
    process.exitCode = 1;
  });
}
