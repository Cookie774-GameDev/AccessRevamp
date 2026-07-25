import assert from 'node:assert/strict';
import test from 'node:test';
import { createSupportSmtp } from '../scripts/worker6/support-smtp.mjs';
import { createIcemailSmtp } from '../scripts/worker6/icemail-smtp.mjs';

test('support replies authenticate and send only as support@accessrevamp.shop', async () => {
  let transportOptions;
  let sent;
  const smtp = createSupportSmtp({
    username: 'support@accessrevamp.shop',
    password: 'abcdefghijklmnop',
    fromAddress: 'support@accessrevamp.shop',
    host: 'smtp.gmail.com',
    port: 587,
  }, {
    createTransport(options) {
      transportOptions = options;
      return {
        async verify() { return true; },
        async sendMail(message) { sent = message; return { messageId: 'support-1' }; },
      };
    },
  });
  await smtp.verify();
  const result = await smtp.sendReply({
    to: 'customer@example.com',
    subject: 'Re: Help',
    body: 'Thanks for contacting AccessRevamp support.',
    inReplyTo: '<message@example.com>',
  });
  assert.equal(transportOptions.auth.user, 'support@accessrevamp.shop');
  assert.equal(sent.from, 'AccessRevamp Support <support@accessrevamp.shop>');
  assert.equal(result, 'support-1');
  await assert.rejects(() => smtp.sendReply({ ...sent, fromAddress: 'combatonline02@gmail.com' }), /sender identity/i);
});

test('Icemail replies use the original matched Azure mailbox and never CombatOnline', async () => {
  let sent;
  const smtp = createIcemailSmtp({
    apiKey: 'test-key',
    fetchImpl: async (url) => {
      assert.match(String(url), /\/mailbox\/01ABC$/);
      return new Response(JSON.stringify({
        success: true,
        data: {
          id: '01ABC',
          username: 'abigail.wright@accessrevamp.shop',
          type: 'AZURE',
          active: true,
          password: 'mailbox-password',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
    createTransport(options) {
      assert.equal(options.host, 'smtp.office365.com');
      assert.equal(options.auth.user, 'abigail.wright@accessrevamp.shop');
      return {
        async verify() { return true; },
        async sendMail(message) { sent = message; return { messageId: 'icemail-1' }; },
      };
    },
  });
  const result = await smtp.sendReply({
    providerMailboxId: '01ABC',
    mailboxAddress: 'abigail.wright@accessrevamp.shop',
    to: 'customer@example.com',
    subject: 'Re: Website question',
    body: 'Thanks for the reply.',
    inReplyTo: '<original@example.com>',
  });
  assert.equal(sent.from, 'abigail.wright@accessrevamp.shop');
  assert.equal(result, 'icemail-1');
  await assert.rejects(
    () => smtp.sendReply({
      providerMailboxId: '01ABC',
      mailboxAddress: 'combatonline02@gmail.com',
      to: 'customer@example.com',
      subject: 'Re: Website question',
      body: 'Thanks.',
    }),
    /mailbox identity/i,
  );
});
