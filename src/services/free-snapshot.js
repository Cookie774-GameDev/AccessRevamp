import { track } from './analytics.js';

const REQUEST_KEY = 'accessrevamp:snapshot-request-id';
const requestId = () => {
  const existing = sessionStorage.getItem(REQUEST_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(REQUEST_KEY, created);
  return created;
};

export function setupFreeSnapshot() {
  const form = document.querySelector('[data-free-snapshot]');
  if (!form) return undefined;
  const status = form.querySelector('[data-snapshot-status]');
  const onFocus = () => track('free_snapshot_started', { route: '/free-snapshot' });
  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    status.textContent = 'Submitting for manual review…';
    try {
      const response = await fetch('/api/free-snapshot', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ websiteUrl: data.get('websiteUrl'), contactEmail: data.get('contactEmail'), businessContext: data.get('businessContext'), consent: data.get('consent') === 'on', requestId: requestId() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'The request could not be submitted.');
      status.textContent = result.status === 'duplicate' ? 'This request is already in the manual-review queue.' : 'Request received. A person will review it before any follow-up.';
      track('intake_completed', { route: '/free-snapshot', status: result.status || 'accepted' });
      form.reset();
    } catch (error) { status.textContent = `${error.message} Your information is still in the form; please try again.`; }
    finally { button.disabled = false; }
  };
  form.addEventListener('focusin', onFocus, { once: true });
  form.addEventListener('submit', onSubmit);
  return () => form.removeEventListener('submit', onSubmit);
}
