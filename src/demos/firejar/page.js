import { demoBrands, picture } from '../../data/visual-assets.js';
import { demoShell } from '../shared/demo-shell.js';
import { PRODUCTS } from './data.js';

const productImages = {
  ember: demoBrands.firejar.products.gentle,
  flare: demoBrands.firejar.products.bright,
  wildfire: demoBrands.firejar.products.hot,
};

export function page() {
  const cards = PRODUCTS.map((product) => `<article class="product-card" data-product data-heat="${product.heat}">
    <div class="product-card__media">${picture(productImages[product.id], { alt: `${product.name}, an invented Ember and Jar spicy peanut butter product`, sizes: '(max-width: 760px) 100vw, 33vw' })}<span aria-hidden="true">${'●'.repeat(product.heat)}${'○'.repeat(3 - product.heat)}</span></div>
    <div class="product-card__copy"><span class="product-card__heat">Heat ${product.heat}/3</span><h2>${product.name}</h2><p class="product-card__price">Sample $${product.price}</p><p>${product.note}</p><button data-add="${product.id}" type="button">Add to demo cart</button></div>
  </article>`).join('');
  return demoShell({
    name: demoBrands.firejar.name,
    purpose: 'A product discovery, cart, and checkout-state demonstration',
    rationale: 'Heat level is treated as a useful browsing attribute while product caveats stay beside the decision.',
    accessibilityNotes: 'Filters are real buttons with pressed state; cart changes are announced; checkout remains a safe local simulation.',
    body: `<section class="demo-hero demo-hero--fire demo-brand-hero"><div class="demo-brand-hero__copy"><p class="eyebrow">Independent pantry concept</p><h1>Sweet first. Heat with a point.</h1><p>Explore three original flavors with a tactile product story and clear heat guidance.</p><a class="demo-jump" href="#firejar-flavors">Find your heat <span aria-hidden="true">↓</span></a></div><div class="demo-brand-hero__media">${picture(demoBrands.firejar.hero, { alt: 'Spicy peanut butter lifting from a spoon beside an Ember and Jar product', loading: 'eager', fetchpriority: 'high', sizes: '(max-width: 760px) 100vw, 56vw' })}</div></section>
    <section id="firejar-flavors" class="firejar-catalog"><div class="firejar-catalog__head"><span class="eyebrow">Three invented flavors</span><h2>Choose the heat.<br>Keep the caveat close.</h2></div><div class="filter-row" aria-label="Filter by heat"><button data-heat-filter="all" aria-pressed="true">All heat</button><button data-heat-filter="1" aria-pressed="false">Gentle</button><button data-heat-filter="2" aria-pressed="false">Bright</button><button data-heat-filter="3" aria-pressed="false">Hot</button></div><section class="product-grid">${cards}</section></section>
    <aside class="demo-cart" aria-labelledby="cart-title"><div><span class="demo-panel__index">Local simulation</span><h2 id="cart-title">Demo cart <span data-cart-count>0</span></h2><p>Nothing here creates an order, payment, shipment, or customer record.</p></div><div data-cart-items><p>Your sample cart is empty.</p></div><div class="demo-cart__total"><p data-cart-total>Sample total: $0</p><button data-demo-checkout type="button">Try demo checkout</button><p data-cart-status role="status" aria-live="polite"></p></div></aside>`,
  });
}
