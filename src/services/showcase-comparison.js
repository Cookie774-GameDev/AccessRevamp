const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const MEDIA_READY = 1;
const SCROLL_SMOOTHING_MS = 180;
const MAX_PROGRESS_PER_SECOND = 0.9;
const PROGRESS_EPSILON = 0.00035;
const SEEK_EPSILON_SECONDS = 1 / 48;
const SEEK_SETTLE_TIMEOUT_MS = 220;
const DESKTOP_SCROLL_DISTANCE_VH = 520;
const MOBILE_SCROLL_DISTANCE_VH = 560;
const MOBILE_BREAKPOINT_PX = 700;

export function setupShowcaseComparisons(root = document) {
  const chapters = [...root.querySelectorAll('[data-showcase-chapter]')];
  if (!chapters.length) return undefined;

  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(globalThis.navigator?.connection?.saveData);
  const cleanups = [];
  const chapterStates = new Map(chapters.map((chapter) => {
    const initial = clamp(Number(chapter.dataset.progress || 0));
    return [chapter, { targetProgress: initial, renderedProgress: initial }];
  }));
  const videoStates = new WeakMap();
  const trackedVideos = new Set();

  let destroyed = false;
  let scrollFrame = 0;
  let smoothingFrame = 0;
  let lastSmoothingTime = 0;
  const supportsSmallViewportUnits = Boolean(globalThis.CSS?.supports?.('height', '1svh'));

  const updateScrollDistance = () => {
    const distance = innerWidth <= MOBILE_BREAKPOINT_PX ? MOBILE_SCROLL_DISTANCE_VH : DESKTOP_SCROLL_DISTANCE_VH;
    const unit = supportsSmallViewportUnits ? 'svh' : 'vh';
    chapters.forEach((chapter) => { chapter.style.height = `${distance}${unit}`; });
  };

  const finishSeek = (video, state) => {
    if (!state.seeking) return;
    state.seeking = false;
    if (state.seekTimer) clearTimeout(state.seekTimer);
    state.seekTimer = 0;
    if (state.seekListener) video.removeEventListener('seeked', state.seekListener);
    state.seekListener = null;

    if (destroyed || video.readyState < MEDIA_READY) return;
    if (Math.abs(video.currentTime - state.targetTime) > SEEK_EPSILON_SECONDS) {
      requestAnimationFrame(() => flushSeek(video, state));
    }
  };

  const flushSeek = (video, state) => {
    if (destroyed || state.seeking) return;
    if (video.readyState < MEDIA_READY || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const target = clamp(state.targetTime, 0, Math.max(0, video.duration - 0.001));
    if (Math.abs(video.currentTime - target) <= SEEK_EPSILON_SECONDS) {
      video.pause();
      return;
    }

    state.seeking = true;
    const settle = () => finishSeek(video, state);
    state.seekListener = settle;
    video.addEventListener('seeked', settle, { once: true });
    state.seekTimer = setTimeout(settle, SEEK_SETTLE_TIMEOUT_MS);

    try {
      video.pause();
      video.currentTime = target;
    } catch {
      finishSeek(video, state);
    }
  };

  const queueVideoSeek = (video, progress) => {
    if (video.readyState < MEDIA_READY || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const playableEnd = Math.max(0, video.duration - 0.001);
    const targetTime = progress >= 1 ? playableEnd : progress * playableEnd;
    let state = videoStates.get(video);
    if (!state) {
      state = { targetTime, seeking: false, seekTimer: 0, seekListener: null };
      videoStates.set(video, state);
      trackedVideos.add(video);
    } else {
      state.targetTime = targetTime;
    }
    flushSeek(video, state);
  };

  const renderProgress = (chapter, next, source = 'scroll') => {
    const progress = clamp(next);
    chapter.dataset.progress = progress.toFixed(4);
    chapter.style.setProperty('--showcase-progress', progress);

    const range = chapter.querySelector('[data-showcase-range]');
    const output = chapter.querySelector('[data-showcase-output]');
    if (range && source !== 'range') range.value = String(Math.round(progress * 100));
    if (output) output.textContent = `${Math.round(progress * 100)}%`;

    chapter.querySelectorAll('video').forEach((video) => queueVideoSeek(video, progress));
  };

  const animateTowardScroll = (time) => {
    smoothingFrame = 0;
    if (destroyed || reducedMotion) return;

    const delta = lastSmoothingTime ? Math.min(64, Math.max(1, time - lastSmoothingTime)) : 16.67;
    lastSmoothingTime = time;
    const blend = 1 - Math.exp(-delta / SCROLL_SMOOTHING_MS);
    const maxStep = MAX_PROGRESS_PER_SECOND * (delta / 1000);
    let unsettled = false;

    chapterStates.forEach((state, chapter) => {
      if (chapter.dataset.dragging === 'true') return;
      const difference = state.targetProgress - state.renderedProgress;
      if (Math.abs(difference) <= PROGRESS_EPSILON) {
        if (state.renderedProgress !== state.targetProgress) {
          state.renderedProgress = state.targetProgress;
          renderProgress(chapter, state.renderedProgress);
        }
        return;
      }

      const easedStep = difference * blend;
      const step = clamp(easedStep, -maxStep, maxStep);
      state.renderedProgress = clamp(state.renderedProgress + step);
      renderProgress(chapter, state.renderedProgress);
      unsettled = true;
    });

    if (unsettled) smoothingFrame = requestAnimationFrame(animateTowardScroll);
    else lastSmoothingTime = 0;
  };

  const ensureSmoothing = () => {
    if (!smoothingFrame && !reducedMotion) smoothingFrame = requestAnimationFrame(animateTowardScroll);
  };

  const setImmediateProgress = (chapter, next, source) => {
    const progress = clamp(next);
    const state = chapterStates.get(chapter);
    if (state) {
      state.targetProgress = progress;
      state.renderedProgress = progress;
    }
    renderProgress(chapter, progress, source);
  };

  const prepare = (chapter) => {
    // Browser automation intentionally leaves the large MP4 requests disabled;
    // interaction tests exercise the shared progress controller separately.
    if (globalThis.navigator?.webdriver) return;

    chapter.querySelectorAll('video[data-src]').forEach((video) => {
      if (video.dataset.prepared === 'true') return;
      const originalSrc = video.dataset.src;
      if (!originalSrc) return;

      video.dataset.prepared = 'true';
      video.preload = saveData || reducedMotion ? 'metadata' : 'auto';
      video.muted = true;
      video.playsInline = true;
      video.src = originalSrc;
      video.load();
    });
  };

  const readScrollTargets = () => {
    scrollFrame = 0;
    if (destroyed || reducedMotion) return;

    chapters.forEach((chapter) => {
      if (chapter.dataset.dragging === 'true') return;
      const rect = chapter.getBoundingClientRect();
      const travel = Math.max(1, rect.height - innerHeight);
      const state = chapterStates.get(chapter);
      if (state) state.targetProgress = clamp(-rect.top / travel);
    });
    ensureSmoothing();
  };

  const scheduleScrollRead = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(readScrollTargets);
  };

  chapters.forEach((chapter) => {
    const stage = chapter.querySelector('[data-showcase-stage]');
    const range = chapter.querySelector('[data-showcase-range]');
    let pointerId = null;
    let startY = 0;
    let startProgress = 0;

    const syncCurrentProgress = () => {
      const state = chapterStates.get(chapter);
      renderProgress(chapter, state?.renderedProgress ?? Number(chapter.dataset.progress || 0), 'media');
    };

    chapter.querySelectorAll('video').forEach((video) => {
      for (const eventName of ['loadedmetadata', 'loadeddata', 'canplay', 'durationchange', 'progress']) {
        video.addEventListener(eventName, syncCurrentProgress);
        cleanups.push(() => video.removeEventListener(eventName, syncCurrentProgress));
      }
      const onError = () => chapter.classList.add('has-media-error');
      video.addEventListener('error', onError, { once: true });
      cleanups.push(() => video.removeEventListener('error', onError));
    });

    if (!stage || !range) return;

    const onPointerDown = (event) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      event.preventDefault();
      pointerId = event.pointerId;
      startY = event.clientY;
      startProgress = chapterStates.get(chapter)?.renderedProgress ?? Number(chapter.dataset.progress || 0);
      chapter.dataset.dragging = 'true';
      stage.classList.add('is-scrubbing');
      stage.style.touchAction = 'none';
      try { stage.setPointerCapture(pointerId); } catch { /* Pointer capture is best-effort. */ }
    };

    const onPointerMove = (event) => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      const distance = Math.max(260, stage.clientHeight * 1.35);
      setImmediateProgress(chapter, startProgress + (event.clientY - startY) / distance, 'pointer');
    };

    const release = (event) => {
      if (pointerId === null || (event.pointerId != null && event.pointerId !== pointerId)) return;
      try {
        if (stage.hasPointerCapture?.(pointerId)) stage.releasePointerCapture(pointerId);
      } catch { /* The browser may already have released the pointer. */ }
      pointerId = null;
      delete chapter.dataset.dragging;
      stage.classList.remove('is-scrubbing');
      stage.style.touchAction = '';
      scheduleScrollRead();
    };

    const onRange = () => setImmediateProgress(chapter, Number(range.value) / 100, 'range');
    stage.addEventListener('pointerdown', onPointerDown, { passive: false });
    stage.addEventListener('pointermove', onPointerMove, { passive: false });
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('lostpointercapture', release);
    range.addEventListener('input', onRange);

    cleanups.push(() => {
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', release);
      stage.removeEventListener('pointercancel', release);
      stage.removeEventListener('lostpointercapture', release);
      range.removeEventListener('input', onRange);
      stage.style.touchAction = '';
    });
  });

  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const index = chapters.indexOf(entry.target);
    [index - 1, index, index + 1].forEach((position) => chapters[position] && prepare(chapters[position]));
  }), { rootMargin: '160% 0px', threshold: 0.01 });

  const handleViewportChange = () => {
    updateScrollDistance();
    scheduleScrollRead();
  };

  chapters.forEach((chapter) => observer.observe(chapter));
  updateScrollDistance();
  prepare(chapters[0]);
  addEventListener('scroll', scheduleScrollRead, { passive: true });
  addEventListener('resize', handleViewportChange, { passive: true });
  addEventListener('orientationchange', handleViewportChange, { passive: true });
  scheduleScrollRead();

  return () => {
    destroyed = true;
    observer.disconnect();
    removeEventListener('scroll', scheduleScrollRead);
    removeEventListener('resize', handleViewportChange);
    removeEventListener('orientationchange', handleViewportChange);
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    if (smoothingFrame) cancelAnimationFrame(smoothingFrame);
    cleanups.forEach((cleanup) => cleanup());
    trackedVideos.forEach((video) => {
      const state = videoStates.get(video);
      if (state?.seekTimer) clearTimeout(state.seekTimer);
      if (state?.seekListener) video.removeEventListener('seeked', state.seekListener);
    });
    chapters.forEach((chapter) => {
      chapter.style.removeProperty('height');
      chapter.querySelectorAll('video').forEach((video) => {
        video.pause();
        video.removeAttribute('src');
        video.load();
      });
    });
  };
}
