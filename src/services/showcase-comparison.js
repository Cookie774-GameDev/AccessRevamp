import '../styles/performance.css';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const MEDIA_READY = 1;
const PRESENTATION_FPS = 24;
const PRESENTATION_INTERVAL_MS = 1000 / PRESENTATION_FPS;
const MEDIA_SYNC_EPSILON_SECONDS = 1 / 48;
const FRAME_SETTLE_TIMEOUT_MS = 160;
const DESKTOP_SCROLL_DISTANCE_VH = 520;
const MOBILE_SCROLL_DISTANCE_VH = 560;
const MOBILE_BREAKPOINT_PX = 700;
const PRELOAD_RADIUS = 1;
const PRELOAD_ROOT_MARGIN = '220% 0px';

export function setupShowcaseComparisons(root = document) {
  const chapters = [...root.querySelectorAll('[data-showcase-chapter]')];
  if (!chapters.length) return undefined;

  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(globalThis.navigator?.connection?.saveData);
  const cleanups = [];
  const chapterStates = new Map(chapters.map((chapter, index) => {
    const initial = clamp(Number(chapter.dataset.progress || 0));
    return [chapter, {
      index,
      targetProgress: initial,
      renderedProgress: initial,
      displayPercent: -1,
      lastPresentationTime: 0,
      stage: chapter.querySelector('[data-showcase-stage]'),
      range: chapter.querySelector('[data-showcase-range]'),
      output: chapter.querySelector('[data-showcase-output]'),
    }];
  }));
  const videoStates = new WeakMap();
  const trackedVideos = new Set();

  let destroyed = false;
  let pageVisible = !document.hidden;
  let scrollFrame = 0;
  let activeIndex = -1;
  let idlePreloadId = 0;
  const supportsSmallViewportUnits = Boolean(globalThis.CSS?.supports?.('height', '1svh'));

  const updateScrollDistance = () => {
    const distance = innerWidth <= MOBILE_BREAKPOINT_PX ? MOBILE_SCROLL_DISTANCE_VH : DESKTOP_SCROLL_DISTANCE_VH;
    const unit = supportsSmallViewportUnits ? 'svh' : 'vh';
    chapters.forEach((chapter) => { chapter.style.height = `${distance}${unit}`; });
  };

  const clearSeekWait = (video, state) => {
    if (state?.frameCallbackId && video.cancelVideoFrameCallback) {
      try { video.cancelVideoFrameCallback(state.frameCallbackId); } catch { /* Best-effort cleanup. */ }
    }
    if (state?.settleTimer) clearTimeout(state.settleTimer);
    if (state?.seekedListener) video.removeEventListener('seeked', state.seekedListener);
    if (state) {
      state.frameCallbackId = 0;
      state.settleTimer = 0;
      state.seekedListener = null;
    }
  };

  const stopVideo = (video, state) => {
    if (!video.paused) video.pause();
    clearSeekWait(video, state);
    if (state) state.pendingSeek = false;
  };

  const seekVideoToLatest = (video, state) => {
    if (destroyed || !pageVisible || state.chapterIndex !== activeIndex) return;
    if (video.readyState < MEDIA_READY || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const targetTime = clamp(state.targetTime, 0, Math.max(0, video.duration - 0.001));
    if (Math.abs(video.currentTime - targetTime) <= MEDIA_SYNC_EPSILON_SECONDS) {
      if (!video.paused) video.pause();
      return;
    }

    if (!video.paused) video.pause();

    if (state.pendingSeek) {
      try {
        video.currentTime = targetTime;
      } catch {
        // Metadata can arrive before the browser exposes a seekable range.
      }
      return;
    }

    state.pendingSeek = true;
    const settle = () => {
      if (!state.pendingSeek) return;
      state.pendingSeek = false;
      clearSeekWait(video, state);
      if (destroyed || !pageVisible || state.chapterIndex !== activeIndex) return;
      seekVideoToLatest(video, state);
    };

    state.seekedListener = settle;
    video.addEventListener('seeked', settle, { once: true });
    state.settleTimer = setTimeout(settle, FRAME_SETTLE_TIMEOUT_MS);

    try {
      video.currentTime = targetTime;
      if (video.requestVideoFrameCallback) {
        state.frameCallbackId = video.requestVideoFrameCallback(settle);
      }
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
        frameCallbackId: 0,
        settleTimer: 0,
        seekedListener: null,
        pendingSeek: false,
      };
      videoStates.set(video, state);
      trackedVideos.add(video);
    } else {
      state.chapterIndex = chapterIndex;
      state.targetTime = targetTime;
    }

    seekVideoToLatest(video, state);
  };

  const syncChapterMedia = (chapter, progress) => {
    const chapterIndex = chapterStates.get(chapter)?.index ?? -1;
    if (chapterIndex !== activeIndex) return;
    chapter.querySelectorAll('video').forEach((video) => queueVideoProgress(video, chapterIndex, progress));
  };

  const renderProgress = (chapter, state, source = 'scroll') => {
    const progress = clamp(state.renderedProgress);
    chapter.dataset.progress = progress.toFixed(4);
    state.stage?.style.setProperty('--showcase-progress', progress);

    const percent = Math.round(progress * 100);
    if (percent !== state.displayPercent) {
      state.displayPercent = percent;
      if (state.range && source !== 'range') state.range.value = String(percent);
      if (state.output) state.output.textContent = `${percent}%`;
    }

    syncChapterMedia(chapter, progress);
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
      stopVideo(video, state);
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
      if (index === previousIndex && !active) {
        chapter.querySelectorAll('video').forEach((video) => stopVideo(video, videoStates.get(video)));
      }

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
      const state = chapterStates.get(activeChapter);
      if (state) {
        state.lastPresentationTime = 0;
        renderProgress(activeChapter, state);
      }
    }
  };

  const presentActiveChapter = (time, force = false) => {
    if (activeIndex < 0) return;
    const chapter = chapters[activeIndex];
    const state = chapterStates.get(chapter);
    if (!state || chapter.dataset.dragging === 'true') return;

    state.renderedProgress = state.targetProgress;
    const terminal = state.renderedProgress <= 0 || state.renderedProgress >= 1;
    if (!force && !terminal && state.lastPresentationTime
      && time - state.lastPresentationTime < PRESENTATION_INTERVAL_MS) return;

    state.lastPresentationTime = time;
    renderProgress(chapter, state);
  };

  const setImmediateProgress = (chapter, next, source) => {
    const progress = clamp(next);
    const state = chapterStates.get(chapter);
    if (!state) return;
    state.targetProgress = progress;
    state.renderedProgress = progress;
    state.lastPresentationTime = 0;
    setActiveIndex(state.index);
    renderProgress(chapter, state, source);
  };

  const readScrollTargets = (time = performance.now()) => {
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
      const targetProgress = clamp(-rect.top / travel);
      if (state) {
        state.targetProgress = targetProgress;
        if (index !== activeIndex) state.renderedProgress = targetProgress;
      }

      if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
        const distance = Math.abs(rect.top);
        if (distance < closestDistance) {
          closestDistance = distance;
          nextActiveIndex = index;
        }
      }
    });

    // Present the old active chapter before switching so a fast scroll still
    // commits its exact 0% or 100% frame instead of abandoning an in-flight seek.
    const activeChanged = nextActiveIndex !== activeIndex;
    presentActiveChapter(time, activeChanged);
    setActiveIndex(nextActiveIndex);
  };

  const scheduleScrollRead = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(readScrollTargets);
  };

  chapters.forEach((chapter) => {
    const state = chapterStates.get(chapter);
    if (!state?.stage || !state.range) return;

    let pointerId = null;
    let startY = 0;
    let startProgress = 0;

    const syncCurrentProgress = () => syncChapterMedia(chapter, state.renderedProgress);
    chapter.querySelectorAll('video').forEach((video) => {
      for (const eventName of ['loadedmetadata', 'loadeddata', 'canplay', 'durationchange', 'progress']) {
        video.addEventListener(eventName, syncCurrentProgress);
        cleanups.push(() => video.removeEventListener(eventName, syncCurrentProgress));
      }
      const onError = () => chapter.classList.add('has-media-error');
      video.addEventListener('error', onError, { once: true });
      cleanups.push(() => video.removeEventListener('error', onError));
    });

    const onPointerDown = (event) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      event.preventDefault();
      setActiveIndex(state.index);
      pointerId = event.pointerId;
      startY = event.clientY;
      startProgress = state.renderedProgress;
      chapter.dataset.dragging = 'true';
      state.stage.classList.add('is-scrubbing');
      state.stage.style.touchAction = 'none';
      try { state.stage.setPointerCapture(pointerId); } catch { /* Pointer capture is best-effort. */ }
    };

    const onPointerMove = (event) => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      const distance = Math.max(320, state.stage.clientHeight * 1.55);
      setImmediateProgress(chapter, startProgress + (event.clientY - startY) / distance, 'pointer');
    };

    const release = (event) => {
      if (pointerId === null || (event.pointerId != null && event.pointerId !== pointerId)) return;
      try {
        if (state.stage.hasPointerCapture?.(pointerId)) state.stage.releasePointerCapture(pointerId);
      } catch { /* The browser may already have released the pointer. */ }
      pointerId = null;
      delete chapter.dataset.dragging;
      state.stage.classList.remove('is-scrubbing');
      state.stage.style.touchAction = '';
      scheduleScrollRead();
    };

    const onRange = () => setImmediateProgress(chapter, Number(state.range.value) / 100, 'range');
    state.stage.addEventListener('pointerdown', onPointerDown, { passive: false });
    state.stage.addEventListener('pointermove', onPointerMove, { passive: false });
    state.stage.addEventListener('pointerup', release);
    state.stage.addEventListener('pointercancel', release);
    state.stage.addEventListener('lostpointercapture', release);
    state.range.addEventListener('input', onRange);

    cleanups.push(() => {
      state.stage.removeEventListener('pointerdown', onPointerDown);
      state.stage.removeEventListener('pointermove', onPointerMove);
      state.stage.removeEventListener('pointerup', release);
      state.stage.removeEventListener('pointercancel', release);
      state.stage.removeEventListener('lostpointercapture', release);
      state.range.removeEventListener('input', onRange);
      state.stage.style.touchAction = '';
    });
  });

  const preloadObserver = 'IntersectionObserver' in globalThis
    ? new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) prepareChapter(entry.target, 'auto');
    }), { rootMargin: PRELOAD_ROOT_MARGIN, threshold: 0.01 })
    : null;
  chapters.forEach((chapter) => preloadObserver?.observe(chapter));

  const handleViewportChange = () => {
    updateScrollDistance();
    scheduleScrollRead();
  };

  const handleVisibilityChange = () => {
    pageVisible = !document.hidden;
    if (!pageVisible) {
      chapters.forEach((chapter) => chapter.querySelectorAll('video').forEach((video) => stopVideo(video, videoStates.get(video))));
    } else {
      scheduleScrollRead();
    }
  };

  chapters.forEach((chapter) => { chapter.dataset.showcaseActive = 'false'; });
  updateScrollDistance();
  prepareChapter(chapters[0], 'metadata');
  const idlePreload = () => prepareChapter(chapters[0], 'auto');
  if (globalThis.requestIdleCallback) idlePreloadId = globalThis.requestIdleCallback(idlePreload, { timeout: 1400 });
  else idlePreloadId = setTimeout(idlePreload, 700);

  addEventListener('scroll', scheduleScrollRead, { passive: true });
  addEventListener('resize', handleViewportChange, { passive: true });
  addEventListener('orientationchange', handleViewportChange, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);
  scheduleScrollRead();

  return () => {
    destroyed = true;
    preloadObserver?.disconnect();
    removeEventListener('scroll', scheduleScrollRead);
    removeEventListener('resize', handleViewportChange);
    removeEventListener('orientationchange', handleViewportChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    if (globalThis.cancelIdleCallback && idlePreloadId) globalThis.cancelIdleCallback(idlePreloadId);
    else if (idlePreloadId) clearTimeout(idlePreloadId);
    cleanups.forEach((cleanup) => cleanup());
    trackedVideos.forEach((video) => stopVideo(video, videoStates.get(video)));
    chapters.forEach((chapter) => {
      chapter.style.removeProperty('height');
      delete chapter.dataset.showcaseActive;
      const state = chapterStates.get(chapter);
      state?.stage?.style.removeProperty('--showcase-progress');
      chapter.querySelectorAll('video').forEach((video) => {
        video.pause();
        video.removeAttribute('src');
        delete video.dataset.prepared;
        video.load();
      });
    });
  };
}
