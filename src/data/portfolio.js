export const portfolioItems = Object.freeze([
  Object.freeze({
    slug: 'japan-through-time',
    index: '01',
    title: 'Japan Through Time',
    eyebrow: 'Five-era scroll film',
    summary: 'A cinematic journey from sacred cedar paths to a near-future city, with every scene driven directly by the visitor’s scroll.',
    href: '/portfolio/japan-through-time/index.html',
    poster: '/portfolio/japan-through-time/assets/scene-01.jpg',
    meta: ['5 eras', 'Bidirectional scrub', 'Mobile ready'],
  }),
  Object.freeze({
    slug: 'moonfold-ronin',
    index: '02',
    title: 'The Moonfold Ronin',
    eyebrow: 'Twenty-scene scroll film',
    summary: 'An origami-inspired ronin epic unfolding across twenty cinematic chapters with a tightly managed lazy-loading window.',
    href: '/portfolio/moonfold-ronin/index.html',
    poster: '/portfolio/moonfold-ronin/assets/scene-01.jpg',
    meta: ['20 scenes', 'Chapter navigation', 'Poster fallback'],
  }),
]);

export const selectedWork = portfolioItems;
export const findPortfolioItem = (slug) => portfolioItems.find((item) => item.slug === slug);
