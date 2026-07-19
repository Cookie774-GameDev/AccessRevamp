export function setupContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return undefined;

  const onSubmit = async (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    if (!form.reportValidity()) {
      status.textContent = 'Please complete the highlighted fields.';
      return;
    }

    const data = new FormData(form);
    const payload = {
      firstName: String(data.get('firstName') || '').trim(),
      lastName: String(data.get('lastName') || '').trim(),
      email: String(data.get('email') || '').trim(),
      websiteUrl: String(data.get('websiteUrl') || '').trim(),
      interest: String(data.get('interest') || '').trim(),
      message: String(data.get('message') || '').trim(),
      consent: form.elements.consent.checked,
      companyFax: String(data.get('companyFax') || ''),
    };

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your request…';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 429) throw new Error('Too many requests were sent. Please wait and try again.');
      if (!response.ok) throw new Error(result.error || 'The request could not be sent.');
      form.reset();
      status.textContent = 'Received. AccessRevamp can reply using the email you provided.';
    } catch (error) {
      status.textContent = error.message === 'Failed to fetch'
        ? 'The preview is not connected to the contact backend. Your message was not sent.'
        : error.message;
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
    }
  };

  form.addEventListener('submit', onSubmit);
  return () => form.removeEventListener('submit', onSubmit);
}
