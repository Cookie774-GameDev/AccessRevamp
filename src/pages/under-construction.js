function buildUnderConstructionPage(disclosure = '') {
  return `<section class="result-section"><div class="result-card"><span class="eyebrow">Production route preview</span><h1>Under construction in this preview</h1><p>This route is registered for the production experience, but its complete view has not been built yet. Nothing here is presented as completed client work.</p>${disclosure}<div class="hero-actions"><a class="button" href="/" data-nav>Return home</a><a class="button button--ghost" href="/contact" data-nav>Contact us</a></div></div></section>`;
}

export function underConstructionPage() {
  return buildUnderConstructionPage();
}

export function portfolioUnderConstructionPage() {
  return buildUnderConstructionPage('<p>Original working demo — not a client engagement.</p>');
}
