import { shell } from '../components/shell.js';

const steps = [
  ['01', 'Public-surface intake', 'We begin with the normal public experience. No credentials, customer records, private files, or internal systems are required for an initial review.'],
  ['02', 'Passive observation', 'We inspect ordinary page behavior without submitting forms, creating accounts, entering checkout, probing admin routes, or attempting exploitation.'],
  ['03', 'Human verification', 'Automated signals are treated as leads. A person confirms context, softens uncertainty, and removes weak claims before delivery.'],
  ['04', 'Editorial direction', 'We choose the story hierarchy, proof, actions, and visual language that answer the verified friction instead of applying a generic template.'],
  ['05', 'Bounded build', 'The selected deliverable is produced against the written page count, asset, platform, motion, and revision boundaries.'],
  ['06', 'Review and handoff', 'The delivered scope is checked again for responsive behavior, accessibility basics, and any limitations that still need to be documented.'],
];

export function processPage({ methodology = false } = {}) {
  return shell(`<section class="page-hero"><div class="container-wide page-hero__split"><div><span class="eyebrow">${methodology ? 'Transparent methodology' : 'The AccessRevamp process'}</span><h1>Careful enough to trust. Clear enough to follow.</h1></div><p class="lede">Observation, verification, design direction, and delivery remain distinct so that a possibility never gets dressed up as a fact.</p></div></section><section class="section"><div class="container-wide process-timeline">${steps.map(([number, title, copy]) => `<article class="process-step"><span class="process-step__number">${number}</span><div class="process-step__body"><h2>${title}</h2><p>${copy}</p></div></article>`).join('')}</div></section><section class="section story-section"><div class="container-wide story-intro"><div><span class="eyebrow">Important boundary</span><h2>Passive review is not penetration testing.</h2></div><p>AccessRevamp does not attempt active exploitation, promise perfect accessibility or security, provide legal certification, or guarantee a revenue result.</p></div></section>`, { pathname: methodology ? '/methodology' : '/process' });
}
