import { pathToFileURL } from 'node:url';
import { composeDraft } from './composer.mjs';
import { loadWorker6Config } from './config.mjs';
import { createGmailImap } from './gmail-imap.mjs';
import { createIcemailSmtp } from './icemail-smtp.mjs';
import { createWorker6Repository } from './repository.mjs';
import { classifyInboundMessage, routeInboundMessage } from './routing.mjs';
import { createSupportSmtp } from './support-smtp.mjs';

export async function runWorker6({
  config,
  imap,
  repository,
  compose = composeDraft,
  supportSender = null,
  icemailSender = null,
}) {
  const counters = { messagesSeen: 0, inserted: 0, draftsCreated: 0, reviewRequired: 0, sent: 0 };
  const runId = await repository.startRun();
  try {
    const messages = await imap.listInboundMessages({ after: new Date(Date.now() - 36 * 60 * 60 * 1000), limit: 50 });
    for (const message of messages) {
      counters.messagesSeen += 1;
      const matches = await repository.findMatches(message);
      const kind = classifyInboundMessage(message, matches, config.supportAddress);
      const routed = kind === 'inbox_owner' ? routeInboundMessage(message, matches) : { kind, ownerKey: null };
      const thread = repository.loadThread ? await repository.loadThread(routed) : [];
      const context = { message, matches, route: routed, thread };
      const recorded = await repository.record(message, routed, context);
      if (!recorded?.inserted) continue;
      counters.inserted += 1;
      const claim = repository.claim
        ? await repository.claim(recorded.assignmentId, routed.ownerKey)
        : { claimed: true };
      if (!claim?.claimed) continue;
      if (kind === 'human_review' || !config.composerCommand) {
        counters.reviewRequired += 1;
        await repository.complete(recorded.assignmentId, 'needs_review', null, kind === 'human_review' ? 'Restricted or ambiguous message.' : 'Draft composer is not configured.');
        continue;
      }
      const drafted = await compose(context, config.composerCommand);
      if (!drafted.ok) {
        counters.reviewRequired += 1;
        await repository.complete(recorded.assignmentId, 'needs_review', null, drafted.reason);
        continue;
      }
      const reply = {
        to: message.from,
        subject: /^re:/i.test(message.subject || '') ? message.subject : `Re: ${message.subject || 'Your message'}`,
        inReplyTo: message.messageId,
        body: drafted.body,
      };
      if (config.autoSendEnabled) {
        let providerMessageId;
        if (kind === 'support') {
          if (!supportSender) throw new Error('Support SMTP sender is not configured.');
          providerMessageId = await supportSender.sendReply({
            ...reply,
            fromAddress: config.supportAddress,
          });
        } else if (kind === 'inbox_owner') {
          if (!icemailSender) throw new Error('Icemail SMTP sender is not configured.');
          await repository.reserveReply(recorded.assignmentId);
          providerMessageId = await icemailSender.sendReply({
            ...reply,
            mailboxAddress: routed.mailboxAddress,
            providerMailboxId: routed.providerMailboxId,
          });
          await repository.recordSentReply(recorded.assignmentId, {
            providerMessageId,
            subject: reply.subject,
            body: reply.body,
          });
        } else {
          throw new Error('Restricted messages cannot be sent automatically.');
        }
        counters.sent += 1;
        await repository.complete(recorded.assignmentId, 'completed', providerMessageId, null);
        continue;
      }
      const draftId = await imap.appendDraft({
        ...reply,
        fromAddress: kind === 'support' ? config.supportAddress : routed.mailboxAddress,
      });
      counters.draftsCreated += 1;
      await repository.complete(recorded.assignmentId, 'draft_ready', draftId, null);
    }
    await repository.finishRun(runId, counters);
    return counters;
  } catch (error) {
    await repository.finishRun(runId, counters, error).catch(() => {});
    throw error;
  }
}

async function main() {
  const config = loadWorker6Config(process.env);
  if (process.argv.includes('--check-config')) {
    process.stdout.write(`${JSON.stringify({ ok: true, ...config.safe })}\n`);
    return;
  }
  const counters = await runWorker6({
    config,
    imap: createGmailImap(config),
    repository: createWorker6Repository(config),
    supportSender: config.autoSendEnabled ? createSupportSmtp(config.support) : null,
    icemailSender: config.autoSendEnabled ? createIcemailSmtp({ apiKey: config.icemailApiKey }) : null,
  });
  process.stdout.write(`${JSON.stringify(counters)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    process.stderr.write(`Worker 6 failed: ${String(error.message || error)}\n`);
    process.exitCode = 1;
  });
}
