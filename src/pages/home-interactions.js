import { setupShowcaseComparisons } from '../services/showcase-comparison.js';
import { setupOrderWizard } from '../services/order-wizard.js';

const HERO_SETTLE_EPSILON = 0.08;

export function setupHomeExperience(root = document) {
  root.classList.add('home-is-enhanced');
  const hero = root.querySelector('[data-reveal-hero]');
  const shell = root.querySelector('.renaissance-home');
  const toggle = hero?.querySelector('[data-reveal-toggle]');
  const finePointer = globalThis.matchMedia?.('(hover: hover) and (pointer: fine)');
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [setupShowcaseComparisons(root), setupOrderWizard(root)];

  let heroFrame = 0;
  let navFrame = 0;
  let heroRect;
  let heroActive = false;
  let heroVisible = true;
  let heroObserver;
  let pointerCaptured = false;
  let navTimer;
  let revealTimer;
  let pageVisible = !document.hidden;
  let navVisible;

  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const smooth = { ...mouse };
  const gridOffset = { x: 0, y: 0 };

  const listen = (target, type, handler, options) => {
    target?.addEventListener(type, handler, options);
    cleanups.push(() => target?.removeEventListener(type, handler, options));
  };

  const updateHeroRect = () => { heroRect = hero?.getBoundingClientRect(); };

  const commitNavVisibility = () => {
    navFrame = 0;
    const next = scrollY > 24 || heroActive || Boolean(shell?.querySelector('.site-header:focus-within'));
    if (next === navVisible) return;
    navVisible = next;
    shell?.classList.toggle('nav-is-visible', next);
  };

  const scheduleNavVisibility = () => {
    if (!navFrame) navFrame = requestAnimationFrame(commitNavVisibility);
  };

  const stopHeroLoop = () => {
    if (!heroFrame) return;
    cancelAnimationFrame(heroFrame);
    heroFrame = 0;
  };

  const paintHero = () => {
    heroFrame = 0;
    if (!pageVisible || !heroVisible || !hero) return;

    const deltaX = mouse.x - smooth.x;
    const deltaY = mouse.y - smooth.y;
    smooth.x += deltaX * 0.12;
    smooth.y += deltaY * 0.12;

    const rect = heroRect || hero.getBoundingClientRect();
    const localX = Math.max(0, Math.min(rect.width, smooth.x - rect.left));
    const localY = Math.max(0, Math.min(rect.height, smooth.y - rect.top));
    const cx = localX / Math.max(rect.width, 1) - 0.5;
    const cy = localY / Math.max(rect.height, 1) - 0.5;
    const targetGridX = cx * 16;
    const targetGridY = cy * 16;
    gridOffset.x += (targetGridX - gridOffset.x) * 0.08;
    gridOffset.y += (targetGridY - gridOffset.y) * 0.08;

    hero.style.setProperty('--reveal-x', `${localX}px`);
    hero.style.setProperty('--reveal-y', `${localY}px`);
    hero.style.setProperty('--grid-x', `${gridOffset.x.toFixed(2)}px`);
    hero.style.setProperty('--grid-y', `${gridOffset.y.toFixed(2)}px`);

    const moving = Math.abs(deltaX) > HERO_SETTLE_EPSILON
      || Math.abs(deltaY) > HERO_SETTLE_EPSILON
      || Math.abs(targetGridX - gridOffset.x) > HERO_SETTLE_EPSILON
      || Math.abs(targetGridY - gridOffset.y) > HERO_SETTLE_EPSILON;
    if (moving) heroFrame = requestAnimationFrame(paintHero);
  };

  const startHeroLoop = () => {
    if (!heroFrame && !reducedMotion && pageVisible && heroVisible && hero) {
      heroFrame = requestAnimationFrame(paintHero);
    }
  };

  const setHeroPointer = (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    heroActive = true;
    hero?.classList.add('is-revealing');
    if (event.clientY <= 104) {
      clearTimeout(navTimer);
      navVisible = true;
      shell?.classList.add('nav-is-visible');
    }
    startHeroLoop();
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

    listen(hero, 'pointerenter', setHeroPointer);
    listen(hero, 'pointermove', (event) => {
      if (event.pointerType === 'touch' && !pointerCaptured) return;
      if (pointerCaptured) event.preventDefault();
      setHeroPointer(event);
    });
    listen(hero, 'pointerleave', () => {
      if (pointerCaptured) return;
      heroActive = false;
      hero.classList.remove('is-revealing');
      clearTimeout(navTimer);
      navTimer = setTimeout(scheduleNavVisibility, 520);
    });
    listen(hero, 'pointerdown', (event) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      event.preventDefault();
      pointerCaptured = true;
      try { hero.setPointerCapture(event.pointerId); } catch { /* Best-effort pointer capture. */ }
      hero.style.touchAction = 'none';
      setHeroPointer(event);
    });

    const releasePointer = (event) => {
      if (!pointerCaptured) return;
      pointerCaptured = false;
      try {
        if (hero.hasPointerCapture?.(event.pointerId)) hero.releasePointerCapture(event.pointerId);
      } catch { /* The browser may already have released the pointer. */ }
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
    listen(globalThis, 'resize', () => {
      updateHeroRect();
      startHeroLoop();
    }, { passive: true });
    listen(globalThis, 'scroll', scheduleNavVisibility, { passive: true });
    listen(document, 'visibilitychange', () => {
      pageVisible = !document.hidden;
      if (pageVisible) startHeroLoop();
      else stopHeroLoop();
    });
    listen(shell?.querySelector('.site-header'), 'focusin', () => {
      navVisible = true;
      shell?.classList.add('nav-is-visible');
    });
    listen(shell?.querySelector('.site-header'), 'focusout', scheduleNavVisibility);

    if (!reducedMotion && !finePointer?.matches) {
      hero.classList.add('is-revealing');
      revealTimer = setTimeout(() => {
        if (!pointerCaptured) hero.classList.remove('is-revealing');
      }, 1800);
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
    }), { threshold: 0.45 });
    countObserver.observe(customerCount);
  } else if (customerCount) {
    customerCount.textContent = '87';
  }

  const reveals = [...root.querySelectorAll('[data-reveal]')];
  let revealObserver;
  if (!reducedMotion && 'IntersectionObserver' in globalThis) {
    revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((element) => revealObserver.observe(element));
  } else {
    reveals.forEach((element) => element.classList.add('is-visible'));
  }

  scheduleNavVisibility();

  return () => {
    cleanups.forEach((cleanup) => cleanup?.());
    revealObserver?.disconnect();
    countObserver?.disconnect();
    heroObserver?.disconnect();
    clearTimeout(navTimer);
    clearTimeout(revealTimer);
    if (navFrame) cancelAnimationFrame(navFrame);
    stopHeroLoop();
    hero?.removeAttribute('style');
    shell?.classList.remove('nav-is-visible');
    root.classList.remove('home-is-enhanced');
  };
}
