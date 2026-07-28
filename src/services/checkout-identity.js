export function bindConfirmedCheckoutEmail(form, email) {
  const normalized = String(email || '').trim().toLowerCase();
  const control = form?.elements?.email;
  if (!control || !normalized) return '';
  control.value = normalized;
  control.readOnly = true;
  control.setAttribute('aria-readonly', 'true');
  return normalized;
}
