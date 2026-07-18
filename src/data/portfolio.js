export const portfolioItems = Object.freeze([
  Object.freeze({
    slug: 'northline-goods', index: '01', title: 'Northline Goods', artWord: 'Made for miles.', category: 'Outdoor storefront', kind: 'homepage',
    summary: 'A rugged storefront concept that turns material detail and trail credibility into a clean purchase path.',
    challenge: 'The range felt capable, but the offer hierarchy did not help a new visitor choose a starting point.',
    direction: 'Lead with a single field-tested promise, make product families scannable, and bring shipping reassurance into the first decision.',
    palette: 'Sun yellow, persimmon, and deep ink', deliverable: 'Homepage direction', fictionalConcept: true,
  }),
  Object.freeze({
    slug: 'morrow-studio', index: '02', title: 'Morrow Studio', artWord: 'Shape the quiet.', category: 'Interior studio', kind: 'homepage',
    summary: 'An architectural studio direction balancing editorial restraint with an unmistakable consultation path.',
    challenge: 'Beautiful imagery carried the mood, while services and next steps disappeared into the same visual weight.',
    direction: 'Use disciplined negative space, one expressive project statement, and a clear consultation action that stays visible.',
    palette: 'Ultramarine, sun, and gallery white', deliverable: 'Homepage direction', fictionalConcept: true,
  }),
  Object.freeze({
    slug: 'fable-finch', index: '03', title: 'Fable & Finch', artWord: 'Small joys, well made.', category: 'Lifestyle shop', kind: 'homepage',
    summary: 'A warm product-story concept that makes discovery playful without hiding what to buy next.',
    challenge: 'A broad catalog made the brand feel charming but unfocused, especially on smaller screens.',
    direction: 'Group the range around moments, pair gentle illustration with direct product cues, and keep one action dominant.',
    palette: 'Mint, persimmon, and parchment', deliverable: 'Homepage direction', fictionalConcept: true,
  }),
  Object.freeze({
    slug: 'sip-savor', index: '04', title: 'Sip / Savor', artWord: 'Pour into now.', category: 'Seasonal campaign', kind: 'campaign',
    summary: 'A bright café campaign system built around one seasonal drink, one mood, and one easy-to-repeat message.',
    challenge: 'Multiple offers competed for attention and left the seasonal launch without a recognizable anchor.',
    direction: 'Use one memorable line, a modular cup motif, and repeatable crops for feed, story, landscape, and print.',
    palette: 'Peach, persimmon, and espresso ink', deliverable: 'Campaign direction', fictionalConcept: true,
  }),
  Object.freeze({
    slug: 'move-well', index: '05', title: 'Move Well', artWord: 'Keep your rhythm.', category: 'Wellness campaign', kind: 'campaign',
    summary: 'A confident movement campaign that feels active and encouraging without default fitness clichés.',
    challenge: 'Generic stock photography and broad wellness language made the offer difficult to remember.',
    direction: 'Build rhythm with simple geometry, speak to consistency rather than perfection, and hold a distinctive blue field.',
    palette: 'Powder blue, ultramarine, and sun', deliverable: 'Campaign direction', fictionalConcept: true,
  }),
  Object.freeze({
    slug: 'form-function', index: '06', title: 'Form / Function', artWord: 'Objects with intent.', category: 'Product campaign', kind: 'campaign',
    summary: 'A strict, graphic launch system for a home-goods collection that makes utility feel desirable.',
    challenge: 'The product photography was strong, but every item appeared with equal importance and no launch story.',
    direction: 'Create a high-contrast campaign frame, feature one hero object, and use disciplined type as a product label system.',
    palette: 'Stone, ink, and sun', deliverable: 'Campaign direction', fictionalConcept: true,
  }),
  Object.freeze({
    slug: 'aether-one', index: '07', title: 'Aether One', artWord: 'Enter a clearer orbit.', category: 'Cinematic product story', kind: 'cinematic',
    summary: 'A scroll-directed launch concept moving from atmospheric scale to focused product detail without visual cuts.',
    challenge: 'A premium product needed a memorable story, but motion could not come at the cost of mobile access or legibility.',
    direction: 'Use one continuous spatial sequence, keep copy to four purposeful beats, and provide strong static and reduced-motion states.',
    palette: 'Night ink, electric blue, and lunar white', deliverable: 'Cinematic scroll concept', fictionalConcept: true,
  }),
]);

export const selectedWork = Object.freeze([
  portfolioItems[0],
  portfolioItems[1],
  portfolioItems[6],
]);

export const findPortfolioItem = (slug) => portfolioItems.find((item) => item.slug === slug);
