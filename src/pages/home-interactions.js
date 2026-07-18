export function setupHomeExperience(root = document) {
  root.classList.add('home-is-enhanced');
  const grid = root.querySelector('[data-lens-grid]');
  const tiles = grid ? [...grid.querySelectorAll('[data-lens]')] : [];
  const media = globalThis.matchMedia?.('(hover: hover) and (pointer: fine)');
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const listeners = [];
  let active = null;
  let keyboardMode = false;

  const listen = (target, type, handler, options) => {
    target?.addEventListener(type, handler, options);
    listeners.push(() => target?.removeEventListener(type, handler, options));
  };

  const setActive = (next) => {
    const before = reducedMotion ? null : new Map(tiles.map((tile) => [tile, tile.getBoundingClientRect()]));
    active = next || null;
    tiles.forEach((tile) => {
      const expanded = tile === active;
      tile.setAttribute('aria-expanded', String(expanded));
      tile.classList.toggle('is-expanded', expanded);
    });
    grid?.classList.toggle('has-expanded-lens', Boolean(active));
    if (before && globalThis.requestAnimationFrame) {
      requestAnimationFrame(() => tiles.forEach((tile) => {
        const first = before.get(tile);
        const last = tile.getBoundingClientRect();
        const deltaX = first.left - last.left;
        const deltaY = first.top - last.top;
        const scaleX = first.width / Math.max(last.width, 1);
        const scaleY = first.height / Math.max(last.height, 1);
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1 && Math.abs(scaleX - 1) < .01 && Math.abs(scaleY - 1) < .01) return;
        tile.getAnimations().forEach((animation) => animation.cancel());
        tile.animate([
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`, transformOrigin: 'top left' },
          { transform: 'none', transformOrigin: 'top left' },
        ], { duration: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      }));
    }
  };

  const toggle = (tile) => setActive(active === tile ? null : tile);

  tiles.forEach((tile) => {
    const onPointerEnter = () => {
      if (media?.matches) setActive(tile);
    };
    const onPointerLeave = () => {
      if (media?.matches && !tile.matches(':focus-within')) setActive(null);
    };
    listen(tile, 'pointerenter', onPointerEnter);
    listen(tile, 'pointerleave', onPointerLeave);
  });

  const onKeyDown = (event) => {
    keyboardMode = true;
    const tile = event.target.closest?.('[data-lens]');
    if (tile && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggle(tile);
    }
  };
  const onPointerDown = (event) => {
    keyboardMode = false;
    if (!grid?.contains(event.target)) setActive(null);
  };
  const onClick = (event) => {
    const tile = event.target.closest?.('[data-lens]');
    if (!tile || (media?.matches && event.detail > 0)) return;
    toggle(tile);
  };
  const onFocusIn = (event) => {
    const tile = event.target.closest?.('[data-lens]');
    if (tile && (keyboardMode || media?.matches)) setActive(tile);
    else if (!tile) setActive(null);
  };

  listen(root, 'keydown', onKeyDown);
  listen(document, 'pointerdown', onPointerDown);
  listen(grid, 'click', onClick);
  listen(root, 'focusin', onFocusIn);

  const reveals = [...root.querySelectorAll('[data-reveal]')];
  let observer;
  if (!reducedMotion && 'IntersectionObserver' in globalThis) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    reveals.forEach((element) => observer.observe(element));
  } else {
    reveals.forEach((element) => element.classList.add('is-visible'));
  }

  return () => {
    listeners.forEach((remove) => remove());
    observer?.disconnect();
    setActive(null);
    root.classList.remove('home-is-enhanced');
  };
}
