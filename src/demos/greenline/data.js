export const SAMPLE_SERVICE_ZIPS = new Set(['60601', '60602', '60603', '60604', '60605']);
export function checkEligibility(zip) {
  if (!/^\d{5}$/.test(String(zip))) return { status: 'invalid', message: 'Enter a five-digit ZIP.' };
  return SAMPLE_SERVICE_ZIPS.has(String(zip)) ? { status: 'eligible', message: 'Inside this fictional sample service area.' } : { status: 'outside-sample-area', message: 'Outside this fictional sample service area.' };
}
export function calculateQuote({ lotSize, frequency, addOns = [] }) {
  const lot = Number(lotSize); if (!Number.isFinite(lot) || lot <= 0) throw new Error('Lot size is required.');
  const base = frequency === 'weekly' ? 42 : 58;
  return { startingPrice: base + Math.ceil(lot / 2500) * 8 + addOns.length * 12, caveat: 'Sample starting price only; access and site condition require human confirmation.' };
}
