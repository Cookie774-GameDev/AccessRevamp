export function normalizePostalAddressCandidate(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function validateCompleteUsPostalAddress(input = {}) {
  const street = normalizePostalAddressCandidate(input.streetLine1);
  const city = normalizePostalAddressCandidate(input.city);
  const region = normalizePostalAddressCandidate(input.region).toUpperCase();
  const postal = normalizePostalAddressCandidate(input.postalCode);
  const missing = [];
  if (!/^\d+[A-Za-z]?\s+\S/.test(street)) missing.push('street number');
  if (!city) missing.push('city');
  if (!/^[A-Z]{2}$/.test(region)) missing.push('state');
  if (!/^\d{5}(?:-\d{4})?$/.test(postal)) missing.push('ZIP code');
  return {
    valid: missing.length === 0,
    missing,
    formatted: missing.length ? '' : `${street}, ${city}, ${region} ${postal}`,
  };
}
