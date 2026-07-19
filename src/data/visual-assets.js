const asset = (id, width, height) => ({
  id,
  width,
  height,
  avif: `${id}.avif`,
  webp: `${id}.webp`,
});

export const visualAssets = {
  signalField: asset('signal-field-01', 840, 900),
  evidenceLayers: asset('evidence-layers-01', 840, 900),
  hierarchyBeacon: asset('hierarchy-beacon-01', 840, 900),
  actionPath: asset('action-path-01', 840, 900),
  greenlineHero: asset('greenline-hero-01', 1536, 1024),
  greenlineDetail: asset('greenline-detail-01', 1448, 1086),
  firejarHero: asset('firejar-hero-01', 1536, 1024),
  firejarGentle: asset('firejar-gentle-01', 1254, 1254),
  firejarBright: asset('firejar-bright-01', 1254, 1254),
  firejarHot: asset('firejar-hot-01', 1254, 1254),
  clearflowHero: asset('clearflow-hero-01', 1536, 1024),
  clearflowDetail: asset('clearflow-detail-01', 1448, 1086),
  greenlineInterface: asset('greenline-interface-01', 1440, 1000),
  firejarInterface: asset('firejar-interface-01', 1440, 1000),
  clearflowInterface: asset('clearflow-interface-01', 1440, 1000),
  auditBefore: asset('audit-before-01', 1440, 1000),
  auditAfter: asset('audit-after-01', 1440, 1000),
};

export const demoBrands = {
  greenline: {
    slug: 'verdant-cut',
    name: 'Verdant Cut Co.',
    hero: visualAssets.greenlineHero,
    detail: visualAssets.greenlineDetail,
    interface: visualAssets.greenlineInterface,
  },
  firejar: {
    slug: 'ember-and-jar',
    name: 'Ember & Jar',
    hero: visualAssets.firejarHero,
    products: {
      gentle: visualAssets.firejarGentle,
      bright: visualAssets.firejarBright,
      hot: visualAssets.firejarHot,
    },
    interface: visualAssets.firejarInterface,
  },
  clearflow: {
    slug: 'clearline-plumbing',
    name: 'Clearline Plumbing',
    hero: visualAssets.clearflowHero,
    detail: visualAssets.clearflowDetail,
    interface: visualAssets.clearflowInterface,
  },
};

const escapeAttribute = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

export function picture(assetRecord, {
  alt = '',
  className = '',
  loading = 'lazy',
  sizes = '100vw',
  fetchpriority = 'auto',
} = {}) {
  const base = '/assets/generated/';
  return `<picture class="${escapeAttribute(className)}">
    <source srcset="${base}${assetRecord.avif}" type="image/avif">
    <source srcset="${base}${assetRecord.webp}" type="image/webp">
    <img src="${base}${assetRecord.webp}" width="${assetRecord.width}" height="${assetRecord.height}" alt="${escapeAttribute(alt)}" loading="${loading}" decoding="async" sizes="${escapeAttribute(sizes)}" fetchpriority="${fetchpriority}">
  </picture>`;
}
