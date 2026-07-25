const panelLabel = (kind) => kind === 'normal' ? 'Normal website' : 'Cinematic scroll website';

export function showcasePanel(kind, src, poster, name) {
  const label = panelLabel(kind);
  return `<figure class="showcase-panel"><figcaption>${label}</figcaption><div class="showcase-panel__media"><video data-src="${src}" poster="${poster}" muted playsinline preload="none" disablepictureinpicture controlslist="nodownload noplaybackrate nofullscreen" draggable="false" aria-label="${name} ${label.toLowerCase()} demonstration"></video><span class="showcase-panel__fallback">Media unavailable. The poster frame preserves the visual comparison.</span></div></figure>`;
}

export function showcaseChapter(pair, index) {
  return `<article class="showcase-chapter" data-showcase-chapter data-progress="0"><div class="showcase-chapter__sticky" data-showcase-stage tabindex="0" aria-label="Scroll or drag to compare ${pair.name}"><div class="showcase-chapter__head"><span>0${index + 1}</span><h3>${pair.name}</h3><p>Original working demo — not a client engagement.</p></div><div class="showcase-pair">${showcasePanel('normal', pair.normal, pair.normalPoster, pair.name)}${showcasePanel('cinematic', pair.cinematic, pair.cinematicPoster, pair.name)}</div><div class="showcase-controls"><span>Scroll or drag to explore</span><label><span class="visually-hidden">${pair.name} comparison progress</span><input type="range" min="0" max="100" value="0" step="1" data-showcase-range><output data-showcase-output>0%</output></label></div></div></article>`;
}
