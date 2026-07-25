export function validationStatusForControl(control) {
  const rawLabel = control?.labels?.[0]?.textContent || control?.name || 'this field';
  const label = String(rawLabel)
    .replace(/\boptional\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `Complete “${label}” before continuing.`;
}
