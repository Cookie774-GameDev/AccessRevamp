import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const addresses = (list = []) => [list].flat().flatMap((entry) => entry?.value || []).map((entry) => entry.address?.toLowerCase()).filter(Boolean);
const bounded = (value, limit = 102_400) => String(value || '').slice(0, limit);

export function createGmailImap(config) {
  const connect = () => new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: true,
    auth: { user: config.imap.address, pass: config.imap.password },
    logger: false,
  });
  return {
    async listInboundMessages({ after = new Date(Date.now() - 36 * 60 * 60 * 1000), limit = 50 } = {}) {
      const client = connect();
      try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        try {
          const ids = await client.search({ since: after });
          const messages = [];
          for await (const item of client.fetch(ids.slice(-limit), { source: true, envelope: true, internalDate: true, emailId: true, threadId: true, uid: true })) {
            const parsed = await simpleParser(item.source, { skipHtmlToText: false, skipTextToHtml: true, maxHtmlLengthToParse: 102_400 });
            messages.push({
              gmailMessageId: String(item.emailId || parsed.messageId || item.uid),
              gmailThreadId: item.threadId ? String(item.threadId) : null,
              messageId: parsed.messageId || null,
              inReplyTo: parsed.inReplyTo || null,
              references: parsed.references || [],
              from: addresses(parsed.from)[0] || '',
              to: addresses(parsed.to),
              subject: bounded(parsed.subject, 998),
              text: bounded(parsed.text),
              receivedAt: (item.internalDate || parsed.date || new Date()).toISOString(),
              rawHeaderHashSource: bounded(item.source.subarray(0, Math.min(item.source.length, 16_384)).toString('utf8'), 16_384),
            });
          }
          return messages;
        } finally {
          lock.release();
        }
      } finally {
        await client.logout().catch(() => {});
      }
    },
    async appendDraft(draft) {
      const client = connect();
      try {
        await client.connect();
        const mailboxes = await client.list();
        const drafts = mailboxes.find((box) => box.specialUse === '\\Draft')?.path || '[Gmail]/Drafts';
        const raw = [
          `From: ${config.imap.address}`,
          `To: ${draft.to}`,
          `Subject: ${draft.subject}`,
          ...(draft.inReplyTo ? [`In-Reply-To: ${draft.inReplyTo}`, `References: ${draft.inReplyTo}`] : []),
          'Content-Type: text/plain; charset=utf-8',
          '',
          draft.body,
        ].join('\r\n');
        const result = await client.append(drafts, Buffer.from(raw), ['\\Draft']);
        return String(result?.uid || '');
      } finally {
        await client.logout().catch(() => {});
      }
    },
  };
}
