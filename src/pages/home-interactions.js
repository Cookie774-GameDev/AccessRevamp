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

  const proofStrip = root.querySelector('[data-proof-strip]');
  const customerCount = proofStrip?.querySelector('[data-customer-count]');
  const customerProof = customerCount?.closest('.proof-counter');
  const deliveryDays = proofStrip?.querySelector('[data-delivery-days]');
  const deliveryProof = deliveryDays?.closest('.proof-delivery');
  const responsiveCopy = proofStrip?.querySelector('[data-responsive-copy]');
  const proofFrames = new Set();
  const proofTimers = new Set();
  let proofObserver;
  let completedProofRoutines = 0;

  const scheduleProofFrame = (callback) => {
    const frame = requestAnimationFrame((time) => {
      proofFrames.delete(frame);
      callback(time);
    });
    proofFrames.add(frame);
  };

  const scheduleProofTask = (callback, delay) => {
    const timer = setTimeout(() => {
      proofTimers.delete(timer);
      callback();
    }, delay);
    proofTimers.add(timer);
  };

  const animateNumber = (element, from, to, duration, onComplete, format = String) => {
    let started;
    const tick = (time) => {
      started ??= time;
      const progress = Math.min(1, (time - started) / duration);
      const eased = 1 - ((1 - progress) ** 3);
      element.textContent = format(Math.round(from + ((to - from) * eased)));
      if (progress < 1) scheduleProofFrame(tick);
      else onComplete?.();
    };
    scheduleProofFrame(tick);
  };

  const completeProofRoutine = () => {
    completedProofRoutines += 1;
    if (completedProofRoutines === 3) proofStrip?.setAttribute('data-proof-state', 'complete');
  };

  const showFinalProof = () => {
    if (!proofStrip || !customerCount || !deliveryDays || !responsiveCopy) return;
    customerCount.textContent = customerCount.getAttribute('data-customer-count') || '87';
    customerCount.setAttribute('data-count-state', 'complete');
    customerCount.setAttribute('data-count-phase', 'complete');
    customerProof?.setAttribute('data-count-state', 'complete');
    deliveryDays.textContent = `${deliveryDays.getAttribute('data-delivery-days') || '3'} days`;
    deliveryDays.setAttribute('data-delivery-state', 'complete');
    deliveryProof?.setAttribute('data-delivery-step', '3');
    responsiveCopy.textContent = responsiveCopy.getAttribute('data-responsive-target') || 'Desktop + mobile';
    responsiveCopy.setAttribute('data-copy-state', 'complete');
    proofStrip.setAttribute('data-proof-state', 'complete');
  };

  const runCustomerProof = () => {
    const peak = Number.parseInt(customerCount?.getAttribute('data-customer-peak') || '127', 10);
    const target = Number.parseInt(customerCount?.getAttribute('data-customer-count') || '87', 10);
    customerCount?.setAttribute('data-count-state', 'running');
    customerCount?.setAttribute('data-count-phase', 'rising');
    customerProof?.setAttribute('data-count-state', 'running');
    animateNumber(customerCount, 0, peak, 620, () => {
      customerCount.setAttribute('data-count-phase', 'peak');
      scheduleProofTask(() => {
        customerCount.setAttribute('data-count-phase', 'settling');
        animateNumber(customerCount, peak, target, 470, () => {
          customerCount.setAttribute('data-count-state', 'complete');
          customerCount.setAttribute('data-count-phase', 'complete');
          customerProof?.setAttribute('data-count-state', 'complete');
          completeProofRoutine();
        });
      }, 260);
    });
  };

  const runDeliveryProof = () => {
    const start = Number.parseInt(deliveryDays?.getAttribute('data-delivery-start') || '30', 10);
    const target = Number.parseInt(deliveryDays?.getAttribute('data-delivery-days') || '3', 10);
    deliveryDays?.setAttribute('data-delivery-state', 'running');
    [1, 2, 3].forEach((step, index) => scheduleProofTask(() => {
      deliveryProof?.setAttribute('data-delivery-step', String(step));
    }, 180 + (index * 260)));
    animateNumber(deliveryDays, start, target, 900, () => {
      deliveryDays.textContent = `${target} days`;
      deliveryDays.setAttribute('data-delivery-state', 'complete');
      deliveryProof?.setAttribute('data-delivery-step', '3');
      completeProofRoutine();
    }, (value) => `${value} days`);
  };

  const runResponsiveProof = () => {
    const target = responsiveCopy?.getAttribute('data-responsive-target') || 'Desktop + mobile';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let locked = '';
    let position = 0;
    responsiveCopy?.setAttribute('data-copy-state', 'running');
    const buildNext = () => {
      if (position >= target.length) {
        responsiveCopy.textContent = target;
        responsiveCopy.setAttribute('data-copy-state', 'complete');
        completeProofRoutine();
        return;
      }
      const targetCharacter = target[position];
      const upperTarget = targetCharacter.toUpperCase();
      const alphabetIndex = alphabet.indexOf(upperTarget);
      if (alphabetIndex < 0) {
        locked += targetCharacter;
        responsiveCopy.textContent = locked;
        position += 1;
        scheduleProofTask(buildNext, 18);
        return;
      }
      let cycleIndex = 0;
      const cycleLetter = () => {
        responsiveCopy.textContent = `${locked}${alphabet[cycleIndex]}`;
        if (cycleIndex >= alphabetIndex) {
          locked += targetCharacter;
          position += 1;
          scheduleProofTask(buildNext, 12);
          return;
        }
        cycleIndex += 1;
        scheduleProofTask(cycleLetter, 6);
      };
      cycleLetter();
    };
    buildNext();
  };

  if (proofStrip && customerCount && deliveryDays && responsiveCopy && !reducedMotion && 'IntersectionObserver' in globalThis) {
    proofObserver = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      proofObserver.disconnect();
      proofStrip.setAttribute('data-proof-state', 'running');
      runCustomerProof();
      runDeliveryProof();
      runResponsiveProof();
    }, { rootMargin: '0px 0px -40% 0px', threshold: 0.15 });
    proofObserver.observe(proofStrip);
  } else {
    showFinalProof();
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
    proofObserver?.disconnect();
    proofFrames.forEach((frame) => cancelAnimationFrame(frame));
    proofTimers.forEach((timer) => clearTimeout(timer));
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
