const PAYMENT_HEALTH_ENDPOINT = '/api/payment-health';

export async function checkoutReadiness(fetchImpl = fetch) {
  try {
    const response = await fetchImpl(PAYMENT_HEALTH_ENDPOINT, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    const exactReadyPayload = Object.keys(payload).length === 1 && payload.ready === true;
    return { ready: response.status === 200 && exactReadyPayload };
  } catch {
    return { ready: false };
  }
}

export function setupCheckoutReadiness(root = document) {
  const panel = root.querySelector('[data-order-panel="3"]');
  const wrapper = panel?.querySelector('[data-checkout-ready]');
  const control = panel?.querySelector('[data-order-checkout]');
  const status = panel?.querySelector('[data-checkout-readiness]');
  if (!panel || !wrapper || !control || !status) return undefined;

  let disposed = false;
  let inFlight = false;
  const setState = (state, message) => {
    wrapper.dataset.checkoutReady = state;
    control.disabled = state !== 'ready';
    control.setAttribute('aria-disabled', String(state !== 'ready'));
    status.textContent = message;
    status.dataset.state = state;
  };
  const check = async () => {
    if (disposed || panel.hidden || inFlight || wrapper.dataset.checkoutReady === 'ready') return;
    inFlight = true;
    setState('checking', 'Checking secure payment availability…');
    const result = await checkoutReadiness();
    if (!disposed) {
      setState(
        result.ready ? 'ready' : 'unavailable',
        result.ready
          ? 'Secure checkout ready'
          : 'Payment is temporarily unavailable. Your project details remain on this device.',
      );
    }
    inFlight = false;
  };
  const observer = new MutationObserver(check);
  observer.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  check();

  return () => {
    disposed = true;
    observer.disconnect();
  };
}
