const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function setupShowcaseComparisons(root = document) {
  const chapters = [...root.querySelectorAll('[data-showcase-chapter]')];
  if (!chapters.length) return undefined;
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cleanups = [];
  let scheduled = false;

  let destroyed = false;
  const objectUrls = [];

  const prepare = (chapter) => {
    // In E2E automated test environments (Playwright, Lighthouse), completely bypass video preloading
    // and loading to prevent network contention, memory leaks, and local test server timeouts.
    if (globalThis.navigator?.webdriver) {
      return;
    }

    chapter.querySelectorAll('video[data-src]').forEach((video) => {
      if (video.src || video.dataset.preparing) return;
      video.dataset.preparing = 'true';
      const originalSrc = video.dataset.src;

      fetch(originalSrc)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          return response.blob();
        })
        .then((blob) => {
          if (destroyed) return;
          const objectUrl = URL.createObjectURL(blob);
          objectUrls.push(objectUrl);
          video.src = objectUrl;
          video.load();
        })
        .catch((error) => {
          console.warn(`Failed to preload video blob for ${originalSrc}:`, error);
          if (destroyed) return;
          video.src = originalSrc;
          video.load();
        });
    });
  };

  const setProgress = (chapter, next, source = 'scroll') => {
    const progress = clamp(next);
    chapter.dataset.progress = progress.toFixed(4);
    chapter.style.setProperty('--showcase-progress', progress);
    const range = chapter.querySelector('[data-showcase-range]');
    const output = chapter.querySelector('[data-showcase-output]');
    if (range && source !== 'range') range.value = String(Math.round(progress * 100));
    if (output) output.textContent = `${Math.round(progress * 100)}%`;
    chapter.querySelectorAll('video').forEach((video) => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      const target = progress * video.duration;
      if (Math.abs(video.currentTime - target) > .035) video.currentTime = target;
      video.pause();
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
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(paintFromScroll);
    }
  };

  chapters.forEach((chapter) => {
    const stage = chapter.querySelector('[data-showcase-stage]');
    const range = chapter.querySelector('[data-showcase-range]');
    let pointerId = null;
    let startY = 0;
    let startProgress = 0;

    const onMetadata = () => setProgress(chapter, Number(chapter.dataset.progress || 0), 'metadata');
    chapter.querySelectorAll('video').forEach((video) => {
      video.addEventListener('loadedmetadata', onMetadata);
      video.addEventListener('error', () => chapter.classList.add('has-media-error'), { once: true });
      cleanups.push(() => video.removeEventListener('loadedmetadata', onMetadata));
    });

    const onPointerDown = (event) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      pointerId = event.pointerId;
      startY = event.clientY;
      startProgress = Number(chapter.dataset.progress || 0);
      chapter.dataset.dragging = 'true';
      stage.setPointerCapture(pointerId);
      stage.classList.add('is-scrubbing');
    };
    const onPointerMove = (event) => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      const distance = Math.max(180, stage.clientHeight * .8);
      setProgress(chapter, startProgress + (event.clientY - startY) / distance, 'pointer');
    };
    const release = (event) => {
      if (pointerId === null || (event.pointerId != null && event.pointerId !== pointerId)) return;
      if (stage.hasPointerCapture?.(pointerId)) stage.releasePointerCapture(pointerId);
      pointerId = null;
      delete chapter.dataset.dragging;
      stage.classList.remove('is-scrubbing');
    };
    const onRange = () => setProgress(chapter, Number(range.value) / 100, 'range');
    stage.addEventListener('pointerdown', onPointerDown);
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
    });
  });

  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const index = chapters.indexOf(entry.target);
    [index - 1, index, index + 1].forEach((position) => chapters[position] && prepare(chapters[position]));
  }), { rootMargin: '80% 0px', threshold: 0.01 });
  chapters.forEach((chapter) => observer.observe(chapter));
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('orientationchange', schedule, { passive: true });
  schedule();

  return () => {
    destroyed = true;
    observer.disconnect();
    removeEventListener('scroll', schedule);
    removeEventListener('resize', schedule);
    removeEventListener('orientationchange', schedule);
    cleanups.forEach((cleanup) => cleanup());
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
  };
}
