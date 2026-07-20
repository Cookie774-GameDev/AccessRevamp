const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const MEDIA_READY = 1;
const SCROLL_SMOOTHING_MS = 360;
const MAX_PROGRESS_PER_SECOND = 0.24;
const PROGRESS_EPSILON = 0.0002;
const SEEK_EPSILON_SECONDS = 1 / 60;
const FRAME_SETTLE_TIMEOUT_MS = 90;
const DESKTOP_SCROLL_DISTANCE_VH = 520;
const MOBILE_SCROLL_DISTANCE_VH = 560;
const MOBILE_BREAKPOINT_PX = 700;
const PRELOAD_RADIUS = 1;

export function setupShowcaseComparisons(root = document) {
  const chapters = [...root.querySelectorAll('[data-showcase-chapter]')];
  if (!chapters.length) return undefined;

  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(globalThis.navigator?.connection?.saveData);
  const cleanups = [];
  const chapterStates = new Map(chapters.map((chapter, index) => {
    const initial = clamp(Number(chapter.dataset.progress || 0));
    return [chapter, { index, targetProgress: initial, renderedProgress: initial }];
  }));
  const videoStates = new WeakMap();
  const trackedVideos = new Set();

  let destroyed = false;
  let scrollFrame = 0;
  let smoothingFrame = 0;
  let lastSmoothingTime = 0;
  let activeIndex = -1;
  const supportsSmallViewportUnits = Boolean(globalThis.CSS?.supports?.('height', '1svh'));

  const updateScrollDistance = () => {
    const distance = innerWidth <= MOBILE_BREAKPOINT_PX ? MOBILE_SCROLL_DISTANCE_VH : DESKTOP_SCROLL_DISTANCE_VH;
    const unit = supportsSmallViewportUnits ? 'svh' : 'vh';
    chapters.forEach((chapter) => { chapter.style.height = `${distance}${unit}`; });
  };

  const clearFrameRequest = (video, state) => {
    if (state.frameCallbackId && video.cancelVideoFrameCallback) {
      try { video.cancelVideoFrameCallback(state.frameCallbackId); } catch { /* Best-effort cleanup. */ }
    }
    state.frameCallbackId = 0;
    if (state.settleTimer) clearTimeout(state.settleTimer);
    state.settleTimer = 0;
    if (state.seekedListener) video.removeEventListener('seeked', state.seekedListener);
    state.seekedListener = null;
    state.pending = false;
  };

  const requestVideoFrame = (video, state) => {
    if (destroyed || state.chapterIndex !== activeIndex || state.pending) return;
    if (video.readyState < MEDIA_READY || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const target = clamp(state.targetTime, 0, Math.max(0, video.duration - 0.001));
    if (Math.abs(video.currentTime - target) <= SEEK_EPSILON_SECONDS) {
      video.pause();
      return;
    }

    state.pending = true;
    const settle = () => {
      if (!state.pending) return;
      clearFrameRequest(video, state);
      if (destroyed || state.chapterIndex !== activeIndex) return;
      if (Math.abs(video.currentTime - state.targetTime) > SEEK_EPSILON_SECONDS) {
        requestAnimationFrame(() => requestVideoFrame(video, state));
      }
    };

    if (video.requestVideoFrameCallback) {
      state.frameCallbackId = video.requestVideoFrameCallback(settle);
    }
    state.seekedListener = settle;
    video.addEventListener('seeked', settle, { once: true });
    state.settleTimer = setTimeout(settle, FRAME_SETTLE_TIMEOUT_MS);

    try {
      video.pause();
      video.currentTime = target;
    } catch {
      settle();
    }
  };

  const queueVideoProgress = (video, chapterIndex, progress) => {
    if (video.readyState < MEDIA_READY || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const playableEnd = Math.max(0, video.duration - 0.001);
    const targetTime = progress >= 1 ? playableEnd : progress * playableEnd;
    let state = videoStates.get(video);
    if (!state) {
      state = {
        chapterIndex,
        targetTime,
        pending: false,
        frameCallbackId: 0,
        settleTimer: 0,
        seekedListener: null,
      };
      videoStates.set(video, state);
      trackedVideos.add(video);
    } else {
      state.chapterIndex = chapterIndex;
      state.targetTime = targetTime;
    }
    requestVideoFrame(video, state);
  };

  const syncChapterMedia = (chapter, progress) => {
    const chapterIndex = chapterStates.get(chapter)?.index ?? -1;
    if (chapterIndex !== activeIndex) return;
    chapter.querySelectorAll('video').forEach((video) => queueVideoProgress(video, chapterIndex, progress));
  };

  const renderProgress = (chapter, next, source = 'scroll') => {
    const progress = clamp(next);
    chapter.dataset.progress = progress.toFixed(4);
    chapter.style.setProperty('--showcase-progress', progress);

    const range = chapter.querySelector('[data-showcase-range]');
    const output = chapter.querySelector('[data-showcase-output]');
    if (range && source !== 'range') range.value = String(Math.round(progress * 100));
    if (output) output.textContent = `${Math.round(progress * 100)}%`;

    syncChapterMedia(chapter, progress);
  };

  const pauseChapter = (chapter) => {
    chapter.querySelectorAll('video').forEach((video) => video.pause());
  };

  const prepareChapter = (chapter, priority = 'metadata') => {
    if (globalThis.navigator?.webdriver) return;
    chapter.querySelectorAll('video[data-src]').forEach((video) => {
      const effectivePriority = saveData || reducedMotion ? 'metadata' : priority;
      if (video.dataset.prepared === 'true') {
        if (effectivePriority === 'auto') video.preload = 'auto';
        return;
      }

      const originalSrc = video.dataset.src;
      if (!originalSrc) return;
      video.dataset.prepared = 'true';
      video.preload = effectivePriority;
      video.muted = true;
      video.playsInline = true;
      video.disableRemotePlayback = true;
      video.src = originalSrc;
      video.load();
    });
  };

  const releaseChapter = (chapter) => {
    chapter.querySelectorAll('video').forEach((video) => {
      const state = videoStates.get(video);
      if (state) clearFrameRequest(video, state);
      video.pause();
      video.preload = 'none';
      video.removeAttribute('src');
      delete video.dataset.prepared;
      video.load();
    });
  };

  const setActiveIndex = (nextIndex) => {
    if (nextIndex === activeIndex) return;
    const previousIndex = activeIndex;
    activeIndex = nextIndex;

    chapters.forEach((chapter, index) => {
      const active = index === activeIndex;
      chapter.dataset.showcaseActive = String(active);
      if (index === previousIndex && !active) pauseChapter(chapter);

      if (active) {
        prepareChapter(chapter, 'auto');
      } else if (activeIndex >= 0 && Math.abs(index - activeIndex) <= PRELOAD_RADIUS) {
        prepareChapter(chapter, 'metadata');
      } else if (activeIndex >= 0 || index > 0) {
        releaseChapter(chapter);
      }
    });

    if (activeIndex >= 0) {
      const activeChapter = chapters[activeIndex];
      const progress = chapterStates.get(activeChapter)?.renderedProgress ?? Number(activeChapter.dataset.progress || 0);
      syncChapterMedia(activeChapter, progress);
    }
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
      setActiveIndex(state.index);
    }
    renderProgress(chapter, progress, source);
  };

  const readScrollTargets = () => {
    scrollFrame = 0;
    if (destroyed) return;

    const viewportCenter = innerHeight / 2;
    let nextActiveIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;

    chapters.forEach((chapter, index) => {
      if (chapter.dataset.dragging === 'true') return;
      const rect = chapter.getBoundingClientRect();
      const travel = Math.max(1, rect.height - innerHeight);
      const state = chapterStates.get(chapter);
      if (!reducedMotion && state) state.targetProgress = clamp(-rect.top / travel);

      if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
        const distance = Math.abs(rect.top);
        if (distance < closestDistance) {
          closestDistance = distance;
          nextActiveIndex = index;
        }
      }
    });

    setActiveIndex(nextActiveIndex);
    ensureSmoothing();
  };

  const scheduleScrollRead = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(readScrollTargets);
  };

  chapters.forEach((chapter) => {
    const state = chapterStates.get(chapter);
    const stage = chapter.querySelector('[data-showcase-stage]');
    const range = chapter.querySelector('[data-showcase-range]');
    let pointerId = null;
    let startY = 0;
    let startProgress = 0;

    const syncCurrentProgress = () => {
      const progress = state?.renderedProgress ?? Number(chapter.dataset.progress || 0);
      syncChapterMedia(chapter, progress);
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

    if (!stage || !range || !state) return;

    const onPointerDown = (event) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      event.preventDefault();
      setActiveIndex(state.index);
      pointerId = event.pointerId;
      startY = event.clientY;
      startProgress = state.renderedProgress;
      chapter.dataset.dragging = 'true';
      stage.classList.add('is-scrubbing');
      stage.style.touchAction = 'none';
      try { stage.setPointerCapture(pointerId); } catch { /* Pointer capture is best-effort. */ }
    };

    const onPointerMove = (event) => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      const distance = Math.max(320, stage.clientHeight * 1.55);
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

  const handleViewportChange = () => {
    updateScrollDistance();
    scheduleScrollRead();
  };

  chapters.forEach((chapter) => { chapter.dataset.showcaseActive = 'false'; });
  updateScrollDistance();
  prepareChapter(chapters[0], 'metadata');
  addEventListener('scroll', scheduleScrollRead, { passive: true });
  addEventListener('resize', handleViewportChange, { passive: true });
  addEventListener('orientationchange', handleViewportChange, { passive: true });
  scheduleScrollRead();

  return () => {
    destroyed = true;
    removeEventListener('scroll', scheduleScrollRead);
    removeEventListener('resize', handleViewportChange);
    removeEventListener('orientationchange', handleViewportChange);
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    if (smoothingFrame) cancelAnimationFrame(smoothingFrame);
    cleanups.forEach((cleanup) => cleanup());
    trackedVideos.forEach((video) => {
      const state = videoStates.get(video);
      if (state) clearFrameRequest(video, state);
    });
    chapters.forEach((chapter) => {
      chapter.style.removeProperty('height');
      delete chapter.dataset.showcaseActive;
      chapter.querySelectorAll('video').forEach((video) => {
        video.pause();
        video.removeAttribute('src');
        delete video.dataset.prepared;
        video.load();
      });
    });
  };
}
