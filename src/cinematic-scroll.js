export function setupCinematicExperience() {
  const stage = document.querySelector('[data-cinematic-stage]');
  if (!stage) return undefined;

  const beats = [...stage.querySelectorAll('[data-cinematic-beat]')];
  const progressBar = stage.querySelector('[data-cinematic-progress]');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let animationFrame = 0;

  const paint = () => {
    animationFrame = 0;
    if (motionPreference.matches) {
      stage.dataset.motion = 'reduced';
      beats.forEach((beat) => beat.classList.add('is-active'));
      if (progressBar) progressBar.style.transform = 'scaleX(1)';
      return;
    }

    stage.dataset.motion = 'scrubbed';
    const rect = stage.getBoundingClientRect();
    const distance = Math.max(1, rect.height - innerHeight);
    const progress = Math.min(1, Math.max(0, -rect.top / distance));
    stage.style.setProperty('--cinematic-progress', progress.toFixed(4));
    if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
    const activeIndex = Math.min(beats.length - 1, Math.floor(progress * beats.length));
    beats.forEach((beat, index) => beat.classList.toggle('is-active', index === activeIndex));
  };

  const requestPaint = () => {
    if (!animationFrame) animationFrame = requestAnimationFrame(paint);
  };

  addEventListener('scroll', requestPaint, { passive: true });
  addEventListener('resize', requestPaint);
  motionPreference.addEventListener?.('change', requestPaint);
  paint();

  return () => {
    cancelAnimationFrame(animationFrame);
    removeEventListener('scroll', requestPaint);
    removeEventListener('resize', requestPaint);
    motionPreference.removeEventListener?.('change', requestPaint);
    stage.style.removeProperty('--cinematic-progress');
  };
}
