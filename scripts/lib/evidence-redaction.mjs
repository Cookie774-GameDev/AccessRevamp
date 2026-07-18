const replacements = Object.freeze([
  [/https:\/\/book\.stripe\.com\/[^\s"'<>\\]+/gi, '[redacted-stripe-checkout-url]'],
  [/\bprice_[A-Za-z0-9_]+\b/g, '[redacted-stripe-price-id]'],
  [/\bwhsec_[A-Za-z0-9_]+\b/g, '[redacted-stripe-webhook-secret]'],
  [/\bsk_(?:test|live)_[A-Za-z0-9_]+\b/g, '[redacted-stripe-secret-key]'],
]);

function redactString(value) {
  return replacements.reduce((redacted, [pattern, replacement]) => redacted.replace(pattern, replacement), value);
}

export function redactEvidence(value) {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(redactEvidence);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redactEvidence(entry)]));
  }
  return value;
}
