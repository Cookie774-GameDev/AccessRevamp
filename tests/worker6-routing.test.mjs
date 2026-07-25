import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyInboundMessage, routeInboundMessage } from '../scripts/worker6/routing.mjs';
import { runWorker6 } from '../scripts/worker6/index.mjs';

test('direct support stays with Worker 6', () => {
  assert.equal(classifyInboundMessage({ to: ['support@accessrevamp.shop'], subject: 'Help', text: 'Can you help?' }, [], 'support@accessrevamp.shop'), 'support');
});

test('a unique approved match routes only to its owner', () => {
  const match = {
    ownerKey: 'owner:avery',
    threadId: 'thread-1',
    mailboxId: 'mbx-1',
    mailboxAddress: 'abigail.wright@accessrevamp.shop',
    providerMailboxId: '01ABC',
  };
  assert.deepEqual(routeInboundMessage({ text: 'Thanks' }, [match]), {
    kind: 'inbox_owner',
    ownerKey: 'owner:avery',
    threadId: 'thread-1',
    mailboxId: 'mbx-1',
    mailboxAddress: 'abigail.wright@accessrevamp.shop',
    providerMailboxId: '01ABC',
  });
});

test('restricted messages require human review', () => {
  for (const text of ['refund my payment', 'privacy deletion request', 'legal notice', 'security breach', 'no thanks']) {
    assert.equal(classifyInboundMessage({ to: ['support@accessrevamp.shop'], subject: '', text }, [{ ownerKey: 'mailbox:mbx_1' }], 'support@accessrevamp.shop'), 'human_review');
  }
});

test('a repeated Gmail ID creates one assignment, one draft, and no sent mail', async () => {
  const messages = [{ gmailMessageId: 'g-1', to: ['prospect@example.com'], from: 'lead@example.com', subject: 'Re: hello', text: 'Interested' }];
  let recorded = false;
  let drafts = 0;
  const result = await runWorker6({
    config: {
      supportAddress: 'support@accessrevamp.shop',
      composerCommand: 'fixture',
      autoSendEnabled: false,
    },
    imap: {
      listInboundMessages: async () => [...messages, ...messages],
      appendDraft: async (draft) => {
        assert.equal(draft.fromAddress, 'abigail.wright@accessrevamp.shop');
        drafts += 1;
        return 'draft-1';
      },
    },
    repository: {
      startRun: async () => 'run-1',
      findMatches: async () => [{
        ownerKey: 'owner:avery',
        threadId: 'thread-1',
        mailboxId: 'mbx-1',
        mailboxAddress: 'abigail.wright@accessrevamp.shop',
        providerMailboxId: '01ABC',
      }],
      loadThread: async () => [{ direction: 'outbound', body: 'Earlier message' }],
      record: async () => recorded ? { inserted: false } : (recorded = true, { inserted: true, assignmentId: 'a-1' }),
      reserveReply: async () => assert.fail('draft-only mode must not reserve a send slot'),
      recordSentReply: async () => assert.fail('draft-only mode must not record a sent reply'),
      complete: async () => {},
      finishRun: async () => {},
    },
    compose: async (context) => {
      assert.equal(context.thread[0].body, 'Earlier message');
      return { ok: true, body: 'Thanks for replying. I reviewed the thread and would be happy to help.' };
    },
  });
  assert.equal(result.draftsCreated, 1);
  assert.equal(drafts, 1);
  assert.equal(result.sent, 0);
});

test('auto-send uses support SMTP for direct support and the original Icemail sender for a matched reply', async () => {
  const messages = [
    {
      gmailMessageId: 'support-1',
      messageId: '<support-1@example.com>',
      to: ['support@accessrevamp.shop'],
      from: 'help@example.com',
      subject: 'Question',
      text: 'Could you explain the homepage plan?',
    },
    {
      gmailMessageId: 'reply-1',
      messageId: '<reply-1@example.com>',
      to: ['combatonline02@gmail.com'],
      from: 'lead@example.com',
      subject: 'Re: website',
      text: 'I am interested.',
    },
  ];
  const sent = [];
  let reserved = 0;
  let loggedReplies = 0;
  const result = await runWorker6({
    config: {
      supportAddress: 'support@accessrevamp.shop',
      composerCommand: 'fixture',
      autoSendEnabled: true,
    },
    imap: {
      listInboundMessages: async () => messages,
      appendDraft: async () => assert.fail('auto-send must not create a Gmail draft'),
    },
    repository: {
      startRun: async () => 'run-1',
      findMatches: async (message) => message.gmailMessageId === 'reply-1' ? [{
        ownerKey: 'owner:avery',
        threadId: 'thread-1',
        mailboxId: 'mbx-1',
        mailboxAddress: 'abigail.wright@accessrevamp.shop',
        providerMailboxId: '01ABC',
      }] : [],
      loadThread: async (route) => route.kind === 'inbox_owner'
        ? [{ direction: 'outbound', body: 'Website review context' }]
        : [],
      record: async (_message, _route, context) => ({
        inserted: true,
        assignmentId: `assignment-${context.message.gmailMessageId}`,
      }),
      reserveReply: async (assignmentId) => {
        assert.equal(assignmentId, 'assignment-reply-1');
        reserved += 1;
      },
      recordSentReply: async (assignmentId, message) => {
        assert.equal(assignmentId, 'assignment-reply-1');
        assert.equal(message.providerMessageId, 'sent-icemail');
        loggedReplies += 1;
      },
      complete: async (_assignmentId, state, providerMessageId) => {
        assert.equal(state, 'completed');
        assert.match(providerMessageId, /^sent-/);
      },
      finishRun: async () => {},
    },
    compose: async () => ({ ok: true, body: 'Thanks for reaching out. I would be happy to help with that.' }),
    supportSender: {
      sendReply: async (message) => {
        sent.push({ transport: 'support', ...message });
        return 'sent-support';
      },
    },
    icemailSender: {
      sendReply: async (message) => {
        sent.push({ transport: 'icemail', ...message });
        return 'sent-icemail';
      },
    },
  });

  assert.equal(result.sent, 2);
  assert.equal(reserved, 1);
  assert.equal(loggedReplies, 1);
  assert.equal(result.draftsCreated, 0);
  assert.equal(sent[0].transport, 'support');
  assert.equal(sent[0].fromAddress, 'support@accessrevamp.shop');
  assert.equal(sent[1].transport, 'icemail');
  assert.equal(sent[1].mailboxAddress, 'abigail.wright@accessrevamp.shop');
  assert.equal(sent[1].providerMailboxId, '01ABC');
});
