const asset = (id, width, height) => ({
  id,
  width,
  height,
  avif: `${id}.avif`,
  webp: `${id}.webp`,
  png: `${id}.png`,
});

export const visualAssets = {
  greenlineHero: asset('greenline-hero-01', 1536, 1024),
  greenlineDetail: asset('greenline-detail-01', 1448, 1086),
  firejarHero: asset('firejar-hero-01', 1536, 1024),
  firejarGentle: asset('firejar-gentle-01', 1254, 1254),
  firejarBright: asset('firejar-bright-01', 1254, 1254),
  firejarHot: asset('firejar-hot-01', 1254, 1254),
  clearflowHero: asset('clearflow-hero-01', 1536, 1024),
  clearflowDetail: asset('clearflow-detail-01', 1448, 1086),
};

export const demoBrands = {
  greenline: {
    slug: 'greenline-lawn-and-grounds',
    name: 'Greenline Lawn & Grounds',
    hero: visualAssets.greenlineHero,
    detail: visualAssets.greenlineDetail,
  },
  firejar: {
    slug: 'firejar-spicy-peanut-butter',
    name: 'Firejar Spicy Peanut Butter',
    hero: visualAssets.firejarHero,
    products: {
      gentle: visualAssets.firejarGentle,
      bright: visualAssets.firejarBright,
      hot: visualAssets.firejarHot,
    },
  },
  clearflow: {
    slug: 'clearflow-plumbing',
    name: 'Clearflow Plumbing',
    hero: visualAssets.clearflowHero,
    detail: visualAssets.clearflowDetail,
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
    <img src="${base}${assetRecord.png}" width="${assetRecord.width}" height="${assetRecord.height}" alt="${escapeAttribute(alt)}" loading="${loading}" decoding="async" sizes="${escapeAttribute(sizes)}" fetchpriority="${fetchpriority}">
  </picture>`;
}
