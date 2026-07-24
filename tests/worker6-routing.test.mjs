import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyInboundMessage, routeInboundMessage } from '../scripts/worker6/routing.mjs';
import { runWorker6 } from '../scripts/worker6/index.mjs';

test('direct support stays with Worker 6', () => {
  assert.equal(classifyInboundMessage({ to: ['support@accessrevamp.shop'], subject: 'Help', text: 'Can you help?' }, [], 'support@accessrevamp.shop'), 'support');
});

test('a unique approved match routes only to its owner', () => {
  assert.deepEqual(routeInboundMessage({ text: 'Thanks' }, [{ ownerKey: 'mailbox:mbx_1' }]), { kind: 'inbox_owner', ownerKey: 'mailbox:mbx_1' });
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
    config: { supportAddress: 'support@accessrevamp.shop', composerCommand: 'fixture' },
    imap: { listInboundMessages: async () => [...messages, ...messages], appendDraft: async () => { drafts += 1; return 'draft-1'; } },
    repository: {
      startRun: async () => 'run-1',
      findMatches: async () => [{ ownerKey: 'mailbox:mbx_1' }],
      record: async () => recorded ? { inserted: false } : (recorded = true, { inserted: true, assignmentId: 'a-1' }),
      complete: async () => {},
      finishRun: async () => {},
    },
    compose: async () => ({ ok: true, body: 'Thanks for replying. I reviewed the thread and would be happy to help.' }),
  });
  assert.equal(result.draftsCreated, 1);
  assert.equal(drafts, 1);
  assert.equal(result.sent, 0);
});
