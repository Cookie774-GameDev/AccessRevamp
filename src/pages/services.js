import { plans } from '../config.js';
import { icon } from '../components/icons.js';
import { shell } from '../components/shell.js';

export function servicesPage() {
  const rows = Object.values(plans).map((plan, index) => `<article class="service-row"><span>0${index + 1}</span><div><span class="kicker">${plan.label}</span><h2>${plan.name}</h2></div><p>${plan.summary}</p><a class="circle-link" href="/pricing" data-nav aria-label="See ${plan.name} pricing">${icon('arrow')}</a></article>`).join('');
  return shell(`<section class="page-hero"><div class="container-wide page-hero__split"><div><span class="eyebrow">Services with a boundary</span><h1>From clearer thinking to a complete story.</h1></div><p class="lede">Start with the smallest useful intervention or choose a fuller build. The scope changes; the commitment to human review does not.</p></div></section><section class="section"><div class="container-wide service-list">${rows}</div></section><section class="section story-section"><div class="container-wide story-intro"><div><span class="eyebrow">What stays true</span><h2>Evidence before drama. Direction before decoration.</h2></div><p>No recurring AccessRevamp platform fee, no invented security claims, and no promise that a design alone guarantees revenue or compliance.</p></div></section>`, { pathname: '/services' });
}
