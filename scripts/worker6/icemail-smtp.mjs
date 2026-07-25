import nodemailer from 'nodemailer';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const READER_ADDRESS = 'combatonline02@gmail.com';
const cleanHeader = (value, name) => {
  const text = String(value || '').trim();
  if (!text || /[\r\n]/.test(text)) throw new Error(`${name} is invalid.`);
  return text;
};

export function createIcemailSmtp({
  apiKey,
  fetchImpl = fetch,
  createTransport = nodemailer.createTransport.bind(nodemailer),
  baseUrl = 'https://app.icemail.ai/api/v1',
}) {
  if (!String(apiKey || '').trim()) throw new Error('ICEMAIL_API_KEY is required.');
  const getTransport = async (message) => {
    const providerMailboxId = cleanHeader(message.providerMailboxId, 'Icemail mailbox ID');
    const mailboxAddress = cleanHeader(message.mailboxAddress, 'Mailbox address').toLowerCase();
    if (!EMAIL.test(mailboxAddress) || mailboxAddress === READER_ADDRESS) {
      throw new Error('Icemail mailbox identity is invalid.');
    }
    const response = await fetchImpl(`${baseUrl}/mailbox/${encodeURIComponent(providerMailboxId)}`, {
      headers: { 'x-api-key': apiKey, accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Icemail mailbox lookup returned HTTP ${response.status}.`);
    const mailbox = (await response.json())?.data;
    if (
      !mailbox
      || mailbox.id !== providerMailboxId
      || String(mailbox.username || '').toLowerCase() !== mailboxAddress
      || mailbox.type !== 'AZURE'
      || mailbox.active !== true
      || !String(mailbox.password || '')
    ) {
      throw new Error('Icemail mailbox identity or SMTP credential is unavailable.');
    }
    return createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: mailboxAddress, pass: mailbox.password },
    });
  };
  return Object.freeze({
    async verifyMailbox(mailbox) {
      const transport = await getTransport(mailbox);
      return transport.verify();
    },
    async sendReply(message) {
      const mailboxAddress = cleanHeader(message.mailboxAddress, 'Mailbox address').toLowerCase();
      const transport = await getTransport(message);
      await transport.verify();
      const result = await transport.sendMail({
        from: mailboxAddress,
        to: cleanHeader(message.to, 'Recipient'),
        subject: cleanHeader(message.subject, 'Subject'),
        text: String(message.body || '').trim(),
        ...(message.inReplyTo ? {
          inReplyTo: cleanHeader(message.inReplyTo, 'In-Reply-To'),
          references: cleanHeader(message.inReplyTo, 'References'),
        } : {}),
      });
      return String(result.messageId || '');
    },
  });
}
