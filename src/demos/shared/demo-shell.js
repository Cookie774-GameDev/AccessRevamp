export const DEMO_DISCLOSURE = 'Original working demo — not a client engagement.';

export function demoShell({ name, purpose, body, rationale, accessibilityNotes }) {
  return `<article class="demo-app"><header class="demo-bar"><a href="/portfolio" data-nav>← AccessRevamp portfolio</a><strong>${DEMO_DISCLOSURE}</strong></header>
    <main class="demo-main"><div class="demo-kicker">${name} / independent concept build</div>${body}</main>
    <footer class="demo-notes"><section><h2>Design rationale</h2><p>${rationale}</p></section><section><h2>Accessibility notes</h2><p>${accessibilityNotes}</p></section><p>${purpose}. Every price, review, address, credential, availability message, and outcome shown here is fictional sample content.</p></footer></article>`;
}

export function demoMessage(target, message, state = 'success') {
  if (!target) return;
  target.dataset.state = state; target.textContent = message;
}
