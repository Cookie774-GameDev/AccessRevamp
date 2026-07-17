import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function requireSecret(value, label) {
  if (!value || value.length < 32) {
    throw new Error(`${label} must contain at least 32 random characters.`);
  }
  return value;
}

export function createPrivateToken() {
  return randomBytes(32).toString('base64url');
}

export function hashPreviewToken(token, secret = process.env.PREVIEW_TOKEN_SECRET) {
  if (!token || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    throw new Error('Invalid private preview token.');
  }
  return createHmac('sha256', requireSecret(secret, 'PREVIEW_TOKEN_SECRET'))
    .update(token)
    .digest('hex');
}

export function createUnsubscribeToken(payload, secret = process.env.UNSUBSCRIBE_SECRET) {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', requireSecret(secret, 'UNSUBSCRIBE_SECRET'))
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function readUnsubscribeToken(token, secret = process.env.UNSUBSCRIBE_SECRET) {
  if (!token || token.length > 1600) throw new Error('Invalid unsubscribe token.');
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) throw new Error('Invalid unsubscribe token.');

  const expected = createHmac('sha256', requireSecret(secret, 'UNSUBSCRIBE_SECRET'))
    .update(encoded)
    .digest();
  let provided;
  try {
    provided = Buffer.from(signature, 'base64url');
  } catch {
    throw new Error('Invalid unsubscribe token.');
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new Error('Invalid unsubscribe token.');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid unsubscribe token.');
  }
  if (!payload || typeof payload !== 'object') throw new Error('Invalid unsubscribe token.');
  return payload;
}
