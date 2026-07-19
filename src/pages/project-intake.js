import { escapeHtml, icon } from '../components/icons.js';
import { shell } from '../components/shell.js';

const eligiblePlans = new Set(['complete_revamp', 'cinematic_scroll']);
const inspirationSites = [
  ['Editorial commerce', 'Aesop', 'https://www.aesop.com/', 'Quiet typography, generous pacing, and product storytelling.'],
  ['Clear technology', 'Stripe', 'https://stripe.com/', 'Strong hierarchy, technical clarity, and confident interaction.'],
  ['Story-led retail', 'Patagonia', 'https://www.patagonia.com/', 'Mission, documentary imagery, and useful commerce structure.'],
  ['Cinematic product', 'Apple AirPods Pro', 'https://www.apple.com/airpods-pro/', 'Scroll pacing, product focus, and controlled motion.'],
  ['Bold campaign', 'Nike', 'https://www.nike.com/', 'Large imagery, direct messaging, and fast category paths.'],
];

export function readIntakePlan(search = globalThis.location?.search || '') {
  const plan = new URLSearchParams(search).get('plan') || '';
  return eligiblePlans.has(plan) ? plan : 'complete_revamp';
}

function readProjectId(search = globalThis.location?.search || '') {
  const project = new URLSearchParams(search).get('project') || '';
  return /^[0-9a-f-]{36}$/i.test(project) ? project : '';
}

const pageChoice = (value, label, description) => `<label class="page-choice"><input type="checkbox" name="pages" value="${value}"><span><strong>${label}</strong><small>${description}</small></span></label>`;

const referenceCard = ([type, name, url, description]) => `<label class="style-reference" data-style-reference><input type="checkbox" name="inspirationChoice" value="${escapeHtml(url)}"><span class="micro-label">${type}</span><strong>${name}</strong><p>${description}</p><a href="${url}" target="_blank" rel="noopener noreferrer">Visit website <span aria-hidden="true">↗</span></a></label>`;

export function projectIntakePage() {
  const plan = readIntakePlan();
  const projectId = readProjectId();
  const cinematic = plan === 'cinematic_scroll';
  const title = cinematic ? '$250 Cinematic Scroll Site' : '$200 Complete Website Revamp';
  return shell(`<section class="page-hero intake-hero"><div class="container-wide page-hero__split"><div><span class="eyebrow">Private project brief</span><h1>Show us what your rebuilt website should feel like.</h1></div><div class="page-hero__aside"><p class="lede">${title} includes the complete page-and-style brief. Choose up to five standard pages, share references, and upload visual direction from your phone or computer.</p><div class="intake-plan-summary"><strong>${title}</strong><span>${cinematic ? 'Complete revamp + cinematic sequence' : 'Complete responsive revamp'}</span><small>${cinematic ? 'Already paid $200? Upgrade for $50 after server verification.' : 'Already paid $50? Upgrade for $150 after server verification.'}</small></div></div></div></section>
  <section class="section intake-section"><div class="container-wide intake-layout">
    <aside class="intake-progress" aria-label="Project brief steps"><span>01 · Pages</span><span>02 · Direction</span><span>03 · References</span><span>04 · Uploads</span><span>05 · Review</span><p>Your draft is submitted only after you press “Send project brief.” Images remain private and are associated with your verified customer project.</p></aside>
    <form class="project-intake-form" data-project-intake-form enctype="multipart/form-data" novalidate>
      <input type="hidden" name="plan" value="${plan}">
      <label>Customer project ID<input name="projectId" value="${escapeHtml(projectId)}" autocomplete="off" inputmode="text" placeholder="Shown in your customer workspace" required></label>
      <fieldset><legend><span>01</span> Choose the pages for this build</legend><p>Select up to five standard pages. A custom page can be named below.</p><div class="page-choice-grid">${pageChoice('home', 'Home', 'Main offer, proof, and next action')}${pageChoice('about', 'About', 'Story, approach, and trust')}${pageChoice('services', 'Services', 'Clear service or offer structure')}${pageChoice('shop', 'Shop / products', 'Products, collections, or packages')}${pageChoice('portfolio', 'Portfolio / gallery', 'Projects, work, or visual proof')}${pageChoice('faq', 'FAQ', 'Objections and useful answers')}${pageChoice('contact', 'Contact / quote', 'Enquiry or booking path')}${pageChoice('custom', 'Another page', 'Name it in the project notes')}</div></fieldset>
      <fieldset><legend><span>02</span> Describe the direction</legend><label>How should the website feel?<textarea name="styleNotes" rows="5" minlength="20" maxlength="2000" placeholder="For example: editorial, energetic, clean, premium, playful, technical…" required></textarea></label><label>Important wording, offers, or sections<textarea name="contentNotes" rows="5" maxlength="4000" placeholder="Paste approved wording or describe what the customer must understand."></textarea></label>${cinematic ? '<label>Cinematic story or scroll idea<textarea name="cinematicNotes" rows="4" maxlength="2000" placeholder="Describe the transformation, product sequence, or story beats you want visitors to experience."></textarea></label>' : ''}</fieldset>
      <fieldset><legend><span>03</span> Pick inspiration and share links</legend><p>Use these five public examples to identify rhythm, typography, or motion you like. AccessRevamp will create an original direction and will not copy another company’s branding, text, imagery, or exact layout.</p><div class="style-reference-grid">${inspirationSites.map(referenceCard).join('')}</div><label>Your reference website links<textarea name="referenceUrls" rows="5" maxlength="4000" inputmode="url" placeholder="Add one public HTTPS link per line."></textarea></label></fieldset>
      <fieldset><legend><span>04</span> Upload style images</legend><div class="upload-dropzone" data-upload-dropzone tabindex="0"><input type="file" name="styleImages" accept="image/*" multiple data-style-images aria-label="Upload style reference images"><span class="upload-dropzone__icon" aria-hidden="true">＋</span><strong>Tap to choose images</strong><p>On desktop, you can also drag and drop. Up to 8 JPG, PNG, WebP, or AVIF images; 8MB each.</p></div><ul class="upload-preview-list" data-upload-preview aria-live="polite"></ul></fieldset>
      <fieldset><legend><span>05</span> Final project notes</legend><label>Anything else we should know?<textarea name="projectNotes" rows="5" maxlength="4000"></textarea></label><label class="consent"><input type="checkbox" name="rightsConfirmed" required><span>I confirm I have permission to share these files and that the supplied wording, claims, offers, and links are approved for this project.</span></label></fieldset>
      <div class="intake-submit"><button class="button" type="submit">Send project brief ${icon('arrow')}</button><p class="form-status" role="status" aria-live="polite"></p></div>
    </form>
  </div></section>`, { pathname: '/project-intake', pageClass: 'project-intake-page' });
}
