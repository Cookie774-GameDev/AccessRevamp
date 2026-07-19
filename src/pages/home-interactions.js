export function setupHomeExperience(root = document) {
  root.classList.add('home-is-enhanced');
  const grid = root.querySelector('[data-lens-grid]');
  const tiles = grid ? [...grid.querySelectorAll('[data-lens]')] : [];
  const finePointer = globalThis.matchMedia?.('(hover: hover) and (pointer: fine)');
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];
  let active = null;
  let intentTimer;
  let lockUntil = 0;

  const listen = (target, type, handler, options) => {
    target?.addEventListener(type, handler, options);
    cleanups.push(() => target?.removeEventListener(type, handler, options));
  };

  const setActive = (next) => {
    if (active === next) return;
    const first = reducedMotion ? null : new Map(tiles.map((tile) => [tile, tile.getBoundingClientRect()]));
    active = next || null;
    tiles.forEach((tile) => {
      const expanded = tile === active;
      tile.classList.toggle('is-expanded', expanded);
      tile.setAttribute('aria-expanded', String(expanded));
    });
    grid?.classList.toggle('has-expanded-lens', Boolean(active));
    lockUntil = performance.now() + (reducedMotion ? 0 : 470);
    if (!first || !globalThis.requestAnimationFrame) return;
    requestAnimationFrame(() => tiles.forEach((tile) => {
      const a = first.get(tile);
      const b = tile.getBoundingClientRect();
      const x = a.left - b.left;
      const y = a.top - b.top;
      const sx = a.width / Math.max(b.width, 1);
      const sy = a.height / Math.max(b.height, 1);
      if (Math.abs(x) < 1 && Math.abs(y) < 1 && Math.abs(sx - 1) < .01 && Math.abs(sy - 1) < .01) return;
      tile.getAnimations().forEach((animation) => animation.cancel());
      tile.animate([
        { transform: `translate(${x}px, ${y}px) scale(${sx}, ${sy})`, transformOrigin: 'top left' },
        { transform: 'none', transformOrigin: 'top left' },
      ], { duration: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }));
  };

  const queueIntent = (tile) => {
    clearTimeout(intentTimer);
    intentTimer = setTimeout(() => setActive(tile), 120);
  };

  tiles.forEach((tile) => {
    listen(tile, 'pointerenter', () => {
      if (finePointer?.matches && performance.now() >= lockUntil) queueIntent(tile);
    });
    listen(tile, 'focus', () => setActive(tile));
    listen(tile, 'keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setActive(null); tile.blur(); }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive(active === tile ? null : tile); }
    });
  });

  listen(grid, 'pointerleave', () => { clearTimeout(intentTimer); if (finePointer?.matches) setActive(null); });
  listen(grid, 'click', (event) => {
    if (finePointer?.matches) return;
    const tile = event.target.closest?.('[data-lens]');
    if (tile) setActive(active === tile ? null : tile);
  });
  listen(document, 'pointerdown', (event) => { if (!grid?.contains(event.target)) setActive(null); });
  listen(document, 'keydown', (event) => { if (event.key === 'Escape') setActive(null); });

  const reveals = [...root.querySelectorAll('[data-reveal]')];
  let observer;
  if (!reducedMotion && 'IntersectionObserver' in globalThis) {
    observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((element) => observer.observe(element));
  } else reveals.forEach((element) => element.classList.add('is-visible'));

  return () => {
    clearTimeout(intentTimer);
    cleanups.forEach((cleanup) => cleanup());
    observer?.disconnect();
    root.classList.remove('home-is-enhanced');
  };
}
