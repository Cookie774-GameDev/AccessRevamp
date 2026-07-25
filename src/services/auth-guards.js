const MAX_RETRY_SECONDS = 60 * 60;

export function authRequestKey(mode, email) {
  return `${String(mode || '').trim().toLowerCase()}:${String(email || '').trim().toLowerCase()}`;
}

export function parseRetryAfterSeconds(value, fallback = 60) {
  const structured = Number(value?.retryAfter);
  const message = String(value?.error || value?.message || '');
  const parsed = Number(message.match(/after\s+(\d+)\s+seconds?/i)?.[1]);
  const candidate = Number.isFinite(structured) && structured > 0
    ? structured
    : Number.isFinite(parsed) && parsed > 0
      ? parsed
      : fallback;
  return Math.max(1, Math.min(MAX_RETRY_SECONDS, Math.ceil(Number(candidate) || 60)));
}

export function cooldownSeconds(availableAt, now = Date.now()) {
  return Math.max(0, Math.ceil((Number(availableAt) - Number(now)) / 1000));
}
