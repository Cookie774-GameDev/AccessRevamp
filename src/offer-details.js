import { plans } from './config.js';

const pack = plans.quick_fix.creativePack;
const creativeItemText = `${pack.totalVariations} Canva-ready marketing creative variations (${pack.masterDirections} master directions × ${pack.formatsPerDirection} formats)`;
const cardSummary = 'A complete agreed website revamp, documented findings, practical growth recommendations, and a 10-piece AI-assisted Canva-ready marketing creative pack.';
const scopeBoundary = 'Boundary: Website scope, platform access, page count, delivery window, and the single promoted offer are confirmed in writing. The creative pack uses client-provided brand assets and Canva Free-compatible elements where practical, includes one consolidated revision round, and excludes ad spend, media buying, printing, photography, motion design, paid stock, and ongoing campaign management.';
const faqAnswer = 'The pack covers one campaign or offer. It includes two approved master creative directions adapted into five standard formats each: square feed, portrait feed, Story/Reel cover, landscape ad, and US Letter/A4 poster. Deliverables are Canva-ready and include recommended headline, call-to-action, caption, and channel notes plus one consolidated revision round. Ad spend, media buying, printing, paid stock, and ongoing management are not included.';
const termsItem = 'The Quick Fix marketing creative pack covers one campaign or offer, 10 Canva-ready variations produced from two master directions across five common formats, and one consolidated revision round. AI may assist concept and copy production, but every final creative is human reviewed. The client remains responsible for the accuracy and legality of supplied logos, images, product information, promotions, claims, and required disclosures. Ad spend, media buying, printing, paid stock, photography, motion design, and ongoing campaign management are excluded unless separately agreed in writing.';

function appendListItem(list, text, markerAttribute) {
  if (!list || list.querySelector(`[${markerAttribute}]`)) return;
  const item = document.createElement('li');
  item.setAttribute(markerAttribute, 'true');
  item.textContent = text;
  list.append(item);
}

function applyPricingDetails() {
  const card = document.querySelector('.price-card.featured');
  if (!card || card.dataset.creativePackApplied === 'true') return;

  const summary = card.querySelector('.price-top + p');
  if (summary) summary.textContent = cardSummary;
  appendListItem(card.querySelector('.check-list'), creativeItemText, 'data-creative-pack');

  const scope = card.querySelector('.scope-note');
  if (scope) {
    scope.innerHTML = '';
    const label = document.createElement('strong');
    label.textContent = 'Boundary:';
    scope.append(label, document.createTextNode(` ${scopeBoundary.replace(/^Boundary:\s*/, '')}`));
  }

  if (location.pathname === '/pricing') {
    const faqList = document.querySelector('.faq-list');
    if (faqList && !faqList.querySelector('[data-creative-pack-faq]')) {
      const details = document.createElement('details');
      details.dataset.creativePackFaq = 'true';
      const summaryElement = document.createElement('summary');
      summaryElement.append('What does the 10-piece Canva marketing pack include?');
      const plus = document.createElement('span');
      plus.textContent = '+';
      summaryElement.append(plus);
      const answer = document.createElement('p');
      answer.textContent = faqAnswer;
      details.append(summaryElement, answer);
      faqList.append(details);
    }
  }

  card.dataset.creativePackApplied = 'true';
}

function applyTermsDetails() {
  if (location.pathname !== '/terms') return;
  appendListItem(document.querySelector('.legal-copy ul'), termsItem, 'data-creative-pack-terms');
}

function applyOfferDetails() {
  applyPricingDetails();
  applyTermsDetails();
}

const app = document.querySelector('#app');
if (app) {
  // Legacy enhancer retained for source history only; the modular renderer owns page composition.
}
applyOfferDetails();
