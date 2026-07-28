const CORRUPTED_CONTRACTION = /\b(?:i|we|you|he|she|it|they|that|there|who|what|where|when|why|how|won|don|can|isn|aren|wasn|weren|didn|doesn|wouldn|shouldn|couldn|hasn|haven|hadn)\?(?:m|re|ve|ll|d|s|t)\b/i;
const CORRUPTED_RANGE = /\d\?\d/;
const CORRUPTED_OPT_OUT = /\breply\s+\?no thanks\?/i;
const CORRUPTED_QUOTE = /\?\p{Lu}[^?\r\n]{1,120}\?\s+\p{Ll}/u;
const MOJIBAKE = /\uFFFD|â(?:€|€™|€œ|€�|€“|€”)/;

export function normalizeOutboundText(value, name = 'Message text') {
  const text = String(value || '').trim();
  if (
    CORRUPTED_CONTRACTION.test(text)
    || CORRUPTED_RANGE.test(text)
    || CORRUPTED_OPT_OUT.test(text)
    || CORRUPTED_QUOTE.test(text)
    || MOJIBAKE.test(text)
  ) {
    throw new Error(`${name} contains likely encoding corruption.`);
  }
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');
}
