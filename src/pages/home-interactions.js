import { setupShowcaseComparisons } from '../services/showcase-comparison.js';
import { setupOrderWizard } from '../services/order-wizard.js';

export function setupHomeExperience(root = document) {
  root.classList.add('home-is-enhanced');
  const hero = root.querySelector('[data-reveal-hero]');
  const shell = root.querySelector('.renaissance-home');
  const cursor = hero?.querySelector('[data-reveal-cursor]');
  const toggle = hero?.querySelector('[data-reveal-toggle]');
  const grid = root.querySelector('[data-lens-grid]');
  const tiles = grid ? [...grid.querySelectorAll('[data-lens]')] : [];
  const finePointer = globalThis.matchMedia?.('(hover: hover) and (pointer: fine)');
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];
  cleanups.push(setupShowcaseComparisons(root), setupOrderWizard(root));
  let active = null;
  let intentTimer;
  let keyboardMode = false;
  let frame = 0;
  let heroRect;
  let heroActive = false;
  let heroVisible = true;
  let heroObserver;
  let pointerCaptured = false;
  let navTimer;
  let pageVisible = !document.hidden;
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const smooth = { ...mouse };
  const gridOffset = { x: 0, y: 0 };

  const listen = (target, type, handler, options) => {
    target?.addEventListener(type, handler, options);
    cleanups.push(() => target?.removeEventListener(type, handler, options));
  };

  const updateHeroRect = () => { heroRect = hero?.getBoundingClientRect(); };
  const setHeroPointer = (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    heroActive = true;
    hero?.classList.add('is-revealing');
    if (event.clientY <= 104) {
      clearTimeout(navTimer);
      shell?.classList.add('nav-is-visible');
    }
  };

  const paintHero = () => {
    if (!pageVisible || !heroVisible || !hero) { frame = 0; return; }
    smooth.x += (mouse.x - smooth.x) * .1;
    smooth.y += (mouse.y - smooth.y) * .1;
    const rect = heroRect || hero.getBoundingClientRect();
    const localX = Math.max(0, Math.min(rect.width, smooth.x - rect.left));
    const localY = Math.max(0, Math.min(rect.height, smooth.y - rect.top));
    const cx = localX / Math.max(rect.width, 1) - .5;
    const cy = localY / Math.max(rect.height, 1) - .5;
    gridOffset.x += (cx * 16 - gridOffset.x) * .06;
    gridOffset.y += (cy * 16 - gridOffset.y) * .06;
    hero.style.setProperty('--reveal-x', `${localX}px`);
    hero.style.setProperty('--reveal-y', `${localY}px`);
    hero.style.setProperty('--grid-x', `${gridOffset.x.toFixed(2)}px`);
    hero.style.setProperty('--grid-y', `${gridOffset.y.toFixed(2)}px`);
    frame = requestAnimationFrame(paintHero);
  };

  const stopHeroLoop = () => {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const startHeroLoop = () => {
    if (!frame && !reducedMotion && pageVisible && heroVisible && hero) frame = requestAnimationFrame(paintHero);
  };

  if (hero) {
    updateHeroRect();
    if ('IntersectionObserver' in globalThis) {
      heroObserver = new IntersectionObserver(([entry]) => {
        heroVisible = Boolean(entry?.isIntersecting);
        if (heroVisible) {
          updateHeroRect();
          startHeroLoop();
        } else {
          stopHeroLoop();
        }
      }, { rootMargin: '20% 0px', threshold: 0 });
      heroObserver.observe(hero);
    }
    startHeroLoop();
    listen(hero, 'pointerenter', (event) => { setHeroPointer(event); startHeroLoop(); });
    listen(hero, 'pointermove', (event) => { if (event.pointerType === 'touch' && !pointerCaptured) return; if (pointerCaptured) event.preventDefault(); setHeroPointer(event); });
    listen(hero, 'pointerleave', () => {
      if (pointerCaptured) return;
      heroActive = false;
      hero.classList.remove('is-revealing');
      navTimer = setTimeout(() => { if (scrollY < 24 && !shell?.querySelector('.site-header:focus-within')) shell?.classList.remove('nav-is-visible'); }, 520);
    });
    listen(hero, 'pointerdown', (event) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      event.preventDefault();
      pointerCaptured = true;
      hero.setPointerCapture(event.pointerId);
      hero.style.touchAction = 'none';
      setHeroPointer(event);
    });
    const releasePointer = (event) => {
      if (!pointerCaptured) return;
      pointerCaptured = false;
      if (hero.hasPointerCapture?.(event.pointerId)) hero.releasePointerCapture(event.pointerId);
      hero.style.touchAction = '';
    };
    listen(hero, 'pointerup', releasePointer);
    listen(hero, 'pointercancel', releasePointer);
    listen(hero, 'lostpointercapture', releasePointer);
    listen(toggle, 'click', () => {
      const full = hero.classList.toggle('is-fully-revealed');
      toggle.setAttribute('aria-pressed', String(full));
      toggle.textContent = full ? 'Show reveal spotlight' : 'Reveal transformation';
      hero.classList.add('is-revealing');
    });
    listen(globalThis, 'resize', updateHeroRect, { passive: true });
    listen(globalThis, 'scroll', () => shell?.classList.toggle('nav-is-visible', scrollY > 24 || heroActive), { passive: true });
    listen(document, 'visibilitychange', () => {
      pageVisible = !document.hidden;
      if (pageVisible) startHeroLoop();
      else stopHeroLoop();
    });
    listen(shell?.querySelector('.site-header'), 'focusin', () => shell?.classList.add('nav-is-visible'));
    if (!reducedMotion && !finePointer?.matches) {
      hero.classList.add('is-revealing');
      setTimeout(() => { if (!pointerCaptured) hero.classList.remove('is-revealing'); }, 1800);
    }
  }

  const customerCount = root.querySelector('[data-customer-count]');
  let countObserver;
  if (customerCount && !reducedMotion && 'IntersectionObserver' in globalThis) {
    customerCount.textContent = '0';
    countObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countObserver.disconnect();
      const started = performance.now();
      const tick = (time) => {
        const progress = Math.min(1, (time - started) / 900);
        customerCount.textContent = String(Math.round(87 * (1 - ((1 - progress) ** 3))));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }), { threshold: .45 });
    countObserver.observe(customerCount);
  } else if (customerCount) customerCount.textContent = '87';

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
      if (finePointer?.matches) queueIntent(tile);
    });
    listen(tile, 'focus', () => { if (keyboardMode || finePointer?.matches) setActive(tile); });
    listen(tile, 'keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setActive(null); tile.blur(); }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive(active === tile ? null : tile); }
    });
  });

  listen(grid, 'pointerleave', () => { clearTimeout(intentTimer); if (finePointer?.matches) setActive(null); });
  listen(grid, 'click', (event) => {
    if (event.detail === 0) return;
    if (finePointer?.matches) return;
    const tile = event.target.closest?.('[data-lens]');
    if (tile) setActive(active === tile ? null : tile);
  });
  listen(document, 'pointerdown', (event) => { keyboardMode = false; if (!grid?.contains(event.target)) setActive(null); });
  listen(document, 'keydown', (event) => { keyboardMode = true; if (event.key === 'Escape') setActive(null); });

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
    cleanups.forEach((cleanup) => cleanup?.());
    observer?.disconnect();
    countObserver?.disconnect();
    heroObserver?.disconnect();
    clearTimeout(navTimer);
    stopHeroLoop();
    hero?.removeAttribute('style');
    shell?.classList.remove('nav-is-visible');
    root.classList.remove('home-is-enhanced');
  };
}
