const RESTRICTED = /\b(refund|chargeback|payment|card|invoice|privacy|delete my data|legal|lawyer|lawsuit|security|breach|hack|abuse|threat|harass|unsubscribe|opt[ -]?out|no thanks|stop emailing)\b/i;

export function routeInboundMessage(message, matches = []) {
  if (RESTRICTED.test(`${message.subject || ''}\n${message.text || ''}`)) return { kind: 'human_review', ownerKey: null };
  if (matches.length === 1 && matches[0]?.ownerKey) {
    const match = matches[0];
    return {
      kind: 'inbox_owner',
      ownerKey: match.ownerKey,
      threadId: match.threadId,
      mailboxId: match.mailboxId,
      mailboxAddress: match.mailboxAddress,
      providerMailboxId: match.providerMailboxId,
    };
  }
  return { kind: 'human_review', ownerKey: null };
}

export function classifyInboundMessage(message, matches = [], supportAddress = '') {
  const route = routeInboundMessage(message, matches);
  if (route.kind === 'human_review' && RESTRICTED.test(`${message.subject || ''}\n${message.text || ''}`)) return 'human_review';
  const directSupport = (message.to || []).some((address) => String(address).toLowerCase() === supportAddress.toLowerCase());
  if (directSupport && matches.length === 0) return 'support';
  return route.kind;
}
