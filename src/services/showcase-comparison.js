const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const MEDIA_READY = 1;

export function setupShowcaseComparisons(root = document) {
  const chapters = [...root.querySelectorAll('[data-showcase-chapter]')];
  if (!chapters.length) return undefined;

  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(globalThis.navigator?.connection?.saveData);
  const cleanups = [];
  let scheduled = false;

  const syncVideo = (video, progress) => {
    if (video.readyState < MEDIA_READY || !Number.isFinite(video.duration) || video.duration <= 0) return;

    const playableEnd = Math.max(0, video.duration - 0.001);
    const target = progress >= 1 ? playableEnd : progress * playableEnd;
    if (Math.abs(video.currentTime - target) <= 0.025) {
      video.pause();
      return;
    }

    try {
      video.pause();
      video.currentTime = target;
    } catch {
      // Metadata can arrive before a browser exposes a seekable range. A later
      // loadeddata/canplay/progress event retries the exact chapter progress.
    }
  };

  const setProgress = (chapter, next, source = 'scroll') => {
    const progress = clamp(next);
    chapter.dataset.progress = progress.toFixed(4);
    chapter.style.setProperty('--showcase-progress', progress);

    const range = chapter.querySelector('[data-showcase-range]');
    const output = chapter.querySelector('[data-showcase-output]');
    if (range && source !== 'range') range.value = String(Math.round(progress * 100));
    if (output) output.textContent = `${Math.round(progress * 100)}%`;

    chapter.querySelectorAll('video').forEach((video) => syncVideo(video, progress));
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

  const paintFromScroll = () => {
    scheduled = false;
    if (reducedMotion) return;

    chapters.forEach((chapter) => {
      if (chapter.dataset.dragging === 'true') return;
      const rect = chapter.getBoundingClientRect();
      const travel = Math.max(1, rect.height - innerHeight);
      setProgress(chapter, clamp(-rect.top / travel));
    });
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(paintFromScroll);
  };

  chapters.forEach((chapter) => {
    const stage = chapter.querySelector('[data-showcase-stage]');
    const range = chapter.querySelector('[data-showcase-range]');
    let pointerId = null;
    let startY = 0;
    let startProgress = 0;

    const syncCurrentProgress = () => setProgress(chapter, Number(chapter.dataset.progress || 0), 'media');
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
      startProgress = Number(chapter.dataset.progress || 0);
      chapter.dataset.dragging = 'true';
      stage.classList.add('is-scrubbing');
      stage.style.touchAction = 'none';
      try { stage.setPointerCapture(pointerId); } catch { /* Pointer capture is best-effort. */ }
    };

    const onPointerMove = (event) => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      const distance = Math.max(180, stage.clientHeight * 0.8);
      setProgress(chapter, startProgress + (event.clientY - startY) / distance, 'pointer');
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
      schedule();
    };

    const onRange = () => setProgress(chapter, Number(range.value) / 100, 'range');
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
  }), { rootMargin: '120% 0px', threshold: 0.01 });

  chapters.forEach((chapter) => observer.observe(chapter));
  prepare(chapters[0]);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('orientationchange', schedule, { passive: true });
  schedule();

  return () => {
    observer.disconnect();
    removeEventListener('scroll', schedule);
    removeEventListener('resize', schedule);
    removeEventListener('orientationchange', schedule);
    cleanups.forEach((cleanup) => cleanup());
    chapters.forEach((chapter) => chapter.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }));
  };
}
