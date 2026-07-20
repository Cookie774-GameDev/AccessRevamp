import '../styles/performance.css';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const MEDIA_READY = 1;
const SCROLL_SMOOTHING_MS = 360;
const MAX_PROGRESS_PER_SECOND = 0.24;
const PROGRESS_EPSILON = 0.0002;
const PRESENTATION_FPS = 24;
const PRESENTATION_INTERVAL_MS = 1000 / PRESENTATION_FPS;
const MEDIA_SYNC_EPSILON_SECONDS = 1 / 30;
const MAX_SEEK_STEP_SECONDS = 1 / 12;
const FORWARD_PLAY_THRESHOLD_SECONDS = 0.18;
const FORWARD_CATCHUP_WINDOW_SECONDS = 0.32;
const MIN_PLAYBACK_RATE = 0.75;
const MAX_PLAYBACK_RATE = 2;
const FRAME_SETTLE_TIMEOUT_MS = 120;
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
  let smoothingFrame = 0;
  let lastSmoothingTime = 0;
  let activeIndex = -1;
  let idlePreloadId = 0;
  const supportsSmallViewportUnits = Boolean(globalThis.CSS?.supports?.('height', '1svh'));

  const updateScrollDistance = () => {
    const distance = innerWidth <= MOBILE_BREAKPOINT_PX ? MOBILE_SCROLL_DISTANCE_VH : DESKTOP_SCROLL_DISTANCE_VH;
    const unit = supportsSmallViewportUnits ? 'svh' : 'vh';
    chapters.forEach((chapter) => { chapter.style.height = `${distance}${unit}`; });
  };

  const stopVideo = (video, state) => {
    if (!video.paused) video.pause();
    if (state?.frameCallbackId && video.cancelVideoFrameCallback) {
      try { video.cancelVideoFrameCallback(state.frameCallbackId); } catch { /* Best-effort cleanup. */ }
    }
    if (state?.animationFrameId) cancelAnimationFrame(state.animationFrameId);
    if (state?.settleTimer) clearTimeout(state.settleTimer);
    if (state?.seekedListener) video.removeEventListener('seeked', state.seekedListener);
    if (state) {
      state.frameCallbackId = 0;
      state.animationFrameId = 0;
      state.settleTimer = 0;
      state.seekedListener = null;
      state.pendingSeek = false;
      state.driveScheduled = false;
      state.playPromise = null;
    }
  };

  const scheduleVideoDrive = (video, state) => {
    if (destroyed || !pageVisible || state.chapterIndex !== activeIndex || state.driveScheduled) return;
    state.driveScheduled = true;
    const run = () => {
      state.driveScheduled = false;
      state.frameCallbackId = 0;
      state.animationFrameId = 0;
      driveVideo(video, state);
    };

    if (!video.paused && video.requestVideoFrameCallback) {
      state.frameCallbackId = video.requestVideoFrameCallback(run);
    } else {
      state.animationFrameId = requestAnimationFrame(run);
    }
  };

  const finishSeek = (video, state) => {
    if (!state.pendingSeek) return;
    state.pendingSeek = false;
    if (state.frameCallbackId && video.cancelVideoFrameCallback) {
      try { video.cancelVideoFrameCallback(state.frameCallbackId); } catch { /* Best-effort cleanup. */ }
    }
    state.frameCallbackId = 0;
    if (state.settleTimer) clearTimeout(state.settleTimer);
    state.settleTimer = 0;
    if (state.seekedListener) video.removeEventListener('seeked', state.seekedListener);
    state.seekedListener = null;
    if (destroyed || !pageVisible || state.chapterIndex !== activeIndex) return;
    scheduleVideoDrive(video, state);
  };

  const seekOneStep = (video, state, difference) => {
    if (state.pendingSeek) return;
    if (!video.paused) video.pause();

    const step = clamp(difference, -MAX_SEEK_STEP_SECONDS, MAX_SEEK_STEP_SECONDS);
    const nextTime = clamp(video.currentTime + step, 0, Math.max(0, video.duration - 0.001));
    if (Math.abs(nextTime - video.currentTime) < 0.001) return;

    state.pendingSeek = true;
    const settle = () => finishSeek(video, state);
    if (video.requestVideoFrameCallback) {
      state.frameCallbackId = video.requestVideoFrameCallback(settle);
    }
    state.seekedListener = settle;
    video.addEventListener('seeked', settle, { once: true });
    state.settleTimer = setTimeout(settle, FRAME_SETTLE_TIMEOUT_MS);

    try {
      video.currentTime = nextTime;
    } catch {
      finishSeek(video, state);
    }
  };

  const driveVideo = (video, state) => {
    if (destroyed || !pageVisible || state.chapterIndex !== activeIndex) {
      stopVideo(video, state);
      return;
    }
    if (video.readyState < MEDIA_READY || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const difference = state.targetTime - video.currentTime;
    if (Math.abs(difference) <= MEDIA_SYNC_EPSILON_SECONDS) {
      if (!video.paused) video.pause();
      return;
    }

    if (difference > FORWARD_PLAY_THRESHOLD_SECONDS && !reducedMotion) {
      const nextRate = clamp(difference / FORWARD_CATCHUP_WINDOW_SECONDS, MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE);
      if (Math.abs(video.playbackRate - nextRate) > 0.05) video.playbackRate = nextRate;

      if (video.paused && !state.playPromise) {
        const playPromise = video.play();
        if (playPromise?.then) {
          state.playPromise = playPromise;
          playPromise.then(() => {
            if (state.playPromise === playPromise) state.playPromise = null;
            scheduleVideoDrive(video, state);
          }).catch(() => {
            if (state.playPromise === playPromise) state.playPromise = null;
            if (!destroyed && pageVisible && state.chapterIndex === activeIndex) {
              seekOneStep(video, state, state.targetTime - video.currentTime);
            }
          });
          return;
        }
      }

      scheduleVideoDrive(video, state);
      return;
    }

    seekOneStep(video, state, difference);
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
        animationFrameId: 0,
        settleTimer: 0,
        seekedListener: null,
        pendingSeek: false,
        driveScheduled: false,
        playPromise: null,
      };
      videoStates.set(video, state);
      trackedVideos.add(video);
    } else {
      state.chapterIndex = chapterIndex;
      state.targetTime = targetTime;
    }
    scheduleVideoDrive(video, state);
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

  const animateTowardScroll = (time) => {
    smoothingFrame = 0;
    if (destroyed || reducedMotion || !pageVisible || activeIndex < 0) return;

    const chapter = chapters[activeIndex];
    const state = chapterStates.get(chapter);
    if (!state || chapter.dataset.dragging === 'true') return;

    const delta = lastSmoothingTime ? Math.min(64, Math.max(1, time - lastSmoothingTime)) : 16.67;
    lastSmoothingTime = time;
    const difference = state.targetProgress - state.renderedProgress;

    if (Math.abs(difference) <= PROGRESS_EPSILON) {
      state.renderedProgress = state.targetProgress;
      renderProgress(chapter, state);
      lastSmoothingTime = 0;
      return;
    }

    const blend = 1 - Math.exp(-delta / SCROLL_SMOOTHING_MS);
    const maxStep = MAX_PROGRESS_PER_SECOND * (delta / 1000);
    state.renderedProgress = clamp(state.renderedProgress + clamp(difference * blend, -maxStep, maxStep));

    if (!state.lastPresentationTime || time - state.lastPresentationTime >= PRESENTATION_INTERVAL_MS) {
      state.lastPresentationTime = time;
      renderProgress(chapter, state);
    }

    smoothingFrame = requestAnimationFrame(animateTowardScroll);
  };

  const ensureSmoothing = () => {
    if (!smoothingFrame && !reducedMotion && pageVisible && activeIndex >= 0) {
      smoothingFrame = requestAnimationFrame(animateTowardScroll);
    }
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

    setActiveIndex(nextActiveIndex);
    ensureSmoothing();
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
      if (smoothingFrame) cancelAnimationFrame(smoothingFrame);
      smoothingFrame = 0;
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
    if (smoothingFrame) cancelAnimationFrame(smoothingFrame);
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
