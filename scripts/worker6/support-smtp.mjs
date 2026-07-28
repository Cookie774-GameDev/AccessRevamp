import nodemailer from 'nodemailer';
import { normalizeOutboundText } from './outbound-text.mjs';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanHeader = (value, name) => {
  const text = String(value || '').trim();
  if (!text || /[\r\n]/.test(text)) throw new Error(`${name} is invalid.`);
  return text;
};

export function createSupportSmtp(config, transportFactory = nodemailer) {
  const username = cleanHeader(config.username, 'Support SMTP username').toLowerCase();
  const fromAddress = cleanHeader(config.fromAddress, 'Support From address').toLowerCase();
  if (!EMAIL.test(username) || username !== fromAddress) {
    throw new Error('Support sender identity does not match the authenticated account.');
  }
  const transport = transportFactory.createTransport({
    host: config.host,
    port: config.port,
    secure: Number(config.port) === 465,
    requireTLS: Number(config.port) !== 465,
    auth: { user: username, pass: config.password },
  });
  return Object.freeze({
    async verify() {
      return transport.verify();
    },
    async sendReply(message) {
      if (message.fromAddress && String(message.fromAddress).toLowerCase() !== fromAddress) {
        throw new Error('Support sender identity mismatch.');
      }
      const result = await transport.sendMail({
        from: `AccessRevamp Support <${fromAddress}>`,
        to: cleanHeader(message.to, 'Recipient'),
        subject: cleanHeader(normalizeOutboundText(message.subject, 'Subject'), 'Subject'),
        text: normalizeOutboundText(message.body, 'Message body'),
        ...(message.inReplyTo ? {
          inReplyTo: cleanHeader(message.inReplyTo, 'In-Reply-To'),
          references: cleanHeader(message.inReplyTo, 'References'),
        } : {}),
      });
      return String(result.messageId || '');
    },
  });
}
