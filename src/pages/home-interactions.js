import { setupShowcaseComparisons } from '../services/showcase-comparison.js';
import { setupOrderWizard } from '../services/order-wizard.js';

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
  let heroActive = false;
  let heroVisible = true;
  let heroObserver;
  let pointerCaptured = false;
  let activePointerId;
  let pointerStart;
  let heroRect = hero?.getBoundingClientRect();
  let navTimer;
  let revealTimer;
  let pageVisible = !document.hidden;
  let navVisible;

  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const listen = (target, type, handler, options) => {
    target?.addEventListener(type, handler, options);
    cleanups.push(() => target?.removeEventListener(type, handler, options));
  };

  const setupExamplePreviews = () => {
    const grid = root.querySelector('[data-example-grid]');
    const cards = [...root.querySelectorAll('[data-example-card]')];
    if (!grid || cards.length === 0) return () => {};
    let activeCard;
    let focusFrame = 0;
    let coarsePointerDown = false;

    const close = (card = activeCard) => {
      if (!card) return;
      card.classList.remove('is-example-active');
      card.querySelector('[data-example-preview]')?.setAttribute('aria-expanded', 'false');
      if (card === activeCard) activeCard = undefined;
      grid.classList.toggle('is-previewing', Boolean(activeCard));
    };

    const open = (card) => {
      if (!card || card === activeCard) return;
      close();
      activeCard = card;
      card.classList.add('is-example-active');
      card.querySelector('[data-example-preview]')?.setAttribute('aria-expanded', 'true');
      grid.classList.add('is-previewing');
    };

    cards.forEach((card) => {
      const preview = card.querySelector('[data-example-preview]');
      listen(card, 'pointerenter', () => {
        if (finePointer?.matches) open(card);
      });
      listen(card, 'pointerleave', () => {
        if (finePointer?.matches && !card.contains(document.activeElement)) close(card);
      });
      listen(preview, 'pointerdown', (event) => {
        coarsePointerDown = event.pointerType === 'touch';
      });
      listen(card, 'focusin', () => {
        if (!coarsePointerDown) open(card);
      });
      listen(card, 'focusout', () => {
        if (focusFrame) cancelAnimationFrame(focusFrame);
        focusFrame = requestAnimationFrame(() => {
          focusFrame = 0;
          if (!card.contains(document.activeElement)) close(card);
        });
      });
      listen(preview, 'click', () => {
        if (finePointer?.matches) {
          open(card);
        } else if (card === activeCard) {
          close(card);
        } else {
          open(card);
        }
        coarsePointerDown = false;
      });
    });

    listen(document, 'keydown', (event) => {
      if (event.key !== 'Escape' || !activeCard) return;
      const preview = activeCard.querySelector('[data-example-preview]');
      close();
      preview?.focus({ preventScroll: true });
    });

    return () => {
      if (focusFrame) cancelAnimationFrame(focusFrame);
      close();
      grid.classList.remove('is-previewing');
    };
  };

  const setupExpandableDetails = () => {
    const controls = [...root.querySelectorAll('[data-transformation-toggle], .plan-artifact')];
    controls.forEach((control) => {
      listen(control, 'click', () => {
        const expanded = control.getAttribute('aria-expanded') !== 'true';
        control.setAttribute('aria-expanded', String(expanded));
        control.closest('.transformation-panel')?.classList.toggle('is-transformation-active', expanded);
      });
      listen(control, 'blur', () => {
        if (control.matches('.plan-artifact')) control.setAttribute('aria-expanded', 'false');
      });
    });
    return () => controls.forEach((control) => {
      control.setAttribute('aria-expanded', 'false');
      control.closest('.transformation-panel')?.classList.remove('is-transformation-active');
    });
  };

  const commitNavVisibility = () => {
    navFrame = 0;
    const next = true;
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

    const rect = heroRect || hero.getBoundingClientRect();
    const localX = Math.max(0, Math.min(rect.width, mouse.x - rect.left));
    const localY = Math.max(0, Math.min(rect.height, mouse.y - rect.top));
    const cx = localX / Math.max(rect.width, 1) - 0.5;
    const cy = localY / Math.max(rect.height, 1) - 0.5;

    hero.style.setProperty('--reveal-x', `${localX}px`);
    hero.style.setProperty('--reveal-y', `${localY}px`);
    hero.style.setProperty('--grid-x', `${(cx * 12).toFixed(2)}px`);
    hero.style.setProperty('--grid-y', `${(cy * 12).toFixed(2)}px`);
  };

  const startHeroLoop = () => {
    if (!heroFrame && !reducedMotion && pageVisible && heroVisible && hero) {
      heroFrame = requestAnimationFrame(paintHero);
    }
  };

  const setHeroPointer = (event) => {
    heroRect ||= hero?.getBoundingClientRect();
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    heroActive = true;
    hero?.classList.add('is-revealing');
    startHeroLoop();
  };

  if (hero) {
    if ('IntersectionObserver' in globalThis) {
      heroObserver = new IntersectionObserver(([entry]) => {
        heroVisible = Boolean(entry?.isIntersecting);
        if (heroVisible) {
          startHeroLoop();
        } else {
          stopHeroLoop();
        }
      }, { rootMargin: '20% 0px', threshold: 0 });
      heroObserver.observe(hero);
    }

    listen(hero, 'pointerenter', setHeroPointer);
    listen(hero, 'pointermove', (event) => {
      if (event.pointerType === 'touch' && activePointerId !== event.pointerId) return;
      if (event.pointerType === 'touch' && pointerStart && !pointerCaptured) {
        const deltaX = Math.abs(event.clientX - pointerStart.x);
        const deltaY = Math.abs(event.clientY - pointerStart.y);
        if (deltaX > 8 && deltaX > deltaY * 1.1) {
          pointerCaptured = true;
          try { hero.setPointerCapture(event.pointerId); } catch { /* Best-effort pointer capture. */ }
        }
      }
      if (pointerCaptured && event.cancelable) event.preventDefault();
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
      activePointerId = event.pointerId;
      pointerStart = { x: event.clientX, y: event.clientY };
      if (event.pointerType === 'pen') {
        pointerCaptured = true;
        try { hero.setPointerCapture(event.pointerId); } catch { /* Best-effort pointer capture. */ }
      }
      setHeroPointer(event);
    });

    const releasePointer = (event) => {
      if (event.pointerId !== activePointerId && activePointerId !== undefined) return;
      if (pointerCaptured) {
        pointerCaptured = false;
        try {
          if (hero.hasPointerCapture?.(event.pointerId)) hero.releasePointerCapture(event.pointerId);
        } catch { /* The browser may already have released the pointer. */ }
      }
      activePointerId = undefined;
      pointerStart = undefined;
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
      heroRect = hero.getBoundingClientRect();
      startHeroLoop();
    }, { passive: true });
    const handleHomeScroll = () => {
      scheduleNavVisibility();
      heroRect = hero.getBoundingClientRect();
    };
    listen(globalThis, 'scroll', handleHomeScroll, { passive: true });
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
  const customerProof = customerCount?.closest('.proof-counter');
  let countObserver;
  let countFrame = 0;
  if (customerCount && !reducedMotion && 'IntersectionObserver' in globalThis) {
    const countTarget = Number.parseInt(customerCount.getAttribute('data-customer-count') || '0', 10);
    customerCount.textContent = '0';
    customerCount.setAttribute('data-count-state', 'idle');
    customerProof?.setAttribute('data-count-state', 'idle');
    countObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countObserver.disconnect();
      customerCount.setAttribute('data-count-state', 'running');
      customerProof?.setAttribute('data-count-state', 'running');
      const started = performance.now();
      const tick = (time) => {
        const progress = Math.min(1, (time - started) / 900);
        customerCount.textContent = String(Math.round(countTarget * (1 - ((1 - progress) ** 3))));
        if (progress < 1) countFrame = requestAnimationFrame(tick);
        else {
          countFrame = 0;
          customerCount.setAttribute('data-count-state', 'complete');
          customerProof?.setAttribute('data-count-state', 'complete');
        }
      };
      countFrame = requestAnimationFrame(tick);
    }), { rootMargin: '0px 0px -40% 0px', threshold: 0.15 });
    countObserver.observe(customerProof || customerCount);
  } else if (customerCount) {
    customerCount.textContent = customerCount.getAttribute('data-customer-count') || customerCount.textContent;
    customerCount.setAttribute('data-count-state', 'complete');
    customerProof?.setAttribute('data-count-state', 'complete');
  }

  cleanups.push(setupExamplePreviews());
  cleanups.push(setupExpandableDetails());
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
    if (countFrame) cancelAnimationFrame(countFrame);
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
