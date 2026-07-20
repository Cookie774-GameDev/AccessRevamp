import { plans } from '../config.js';
import { escapeHtml, icon } from './icons.js';

const paidPlans = ['homepage_reveal', 'complete_revamp', 'cinematic_scroll'].map((key) => plans[key]);

const planOption = (plan) => `<label class="order-plan" data-order-plan="${plan.key}">
  <input type="radio" name="orderPlan" value="${plan.key}" ${plan.key === 'complete_revamp' ? 'checked' : ''}>
  <span><b>${escapeHtml(plan.name)}</b><strong>${escapeHtml(plan.displayPrice)}</strong><small>${escapeHtml(plan.summary)}</small></span>
</label>`;

export function orderWizard() {
  return `<section class="section order-flow-section" id="start-project"><div class="container-wide">
    <div class="chapter-head chapter-head--light"><span class="chapter-index">Build your request</span><div><h2>Tell us what the finished website needs to do.</h2><p>Review the scope, then continue to secure test checkout. Draft text stays on this device.</p></div></div>
    <form class="order-wizard" data-order-wizard novalidate>
      <nav class="order-wizard__steps" aria-label="Project request progress">${['Contact', 'Plan', 'Brief', 'Review', 'Payment'].map((label, index) => `<button type="button" data-order-step-jump="${index}" aria-current="${index === 0 ? 'step' : 'false'}"><span>0${index + 1}</span>${label}</button>`).join('')}</nav>
      <div class="order-wizard__panel" data-order-panel="0">
        <div class="order-wizard__heading"><span>Step 01</span><h3>Contact and current website</h3></div>
        <div class="order-fields order-fields--two">
          <label>Full name<input name="fullName" autocomplete="name" required minlength="2"></label>
          <label>Business or company name<input name="businessName" autocomplete="organization" required minlength="2"></label>
          <label>Current website URL<input name="websiteUrl" type="url" inputmode="url" placeholder="https://example.com" required></label>
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>Phone <span>optional</span><input name="phone" type="tel" autocomplete="tel"></label>
          <label>Business niche or category<input name="businessNiche" required placeholder="Restaurant, home service, studio…"></label>
        </div>
      </div>
      <div class="order-wizard__panel" data-order-panel="1" hidden>
        <div class="order-wizard__heading"><span>Step 02</span><h3>Choose a one-time plan</h3></div>
        <div class="order-plan-grid">${paidPlans.map(planOption).join('')}</div>
        <p class="order-note">Upgrade credit: $50 → $200 costs $150; $50 → $250 costs $200; $200 → $250 costs $50.</p>
      </div>
      <div class="order-wizard__panel" data-order-panel="2" hidden>
        <div class="order-wizard__heading"><span>Step 03</span><h3>Specific request and references</h3></div>
        <div class="order-fields order-fields--two">
          <label>Main website goal<textarea name="mainGoal" required minlength="20" rows="4"></textarea></label>
          <label>Requested pages and sections<textarea name="requestedPages" required rows="4" placeholder="Home, services, about, contact…"></textarea></label>
          <label>Required features and integrations<textarea name="integrations" rows="4" placeholder="Booking, ecommerce, CMS, analytics…"></textarea></label>
          <label>Preferred style and colors<textarea name="styleDirection" required rows="4"></textarea></label>
          <label>Brand copy and content status<select name="contentStatus" required><option value="">Choose one</option><option>Ready to use</option><option>Needs editing</option><option>Needs writing support</option></select></label>
          <label>Desired launch date<input name="launchDate" type="date"></label>
          <label class="order-fields__wide">Reference website URLs<textarea name="referenceUrls" rows="3" placeholder="One public URL per line"></textarea></label>
          <label class="order-fields__wide">Freeform specific request<textarea name="specificRequest" rows="5"></textarea></label>
          <label class="order-fields__wide" data-cinematic-fields hidden>Cinematic storyboard, scene order, scroll moments, motion direction, source assets, and reduced-motion preference<textarea name="cinematicDirection" rows="5"></textarea></label>
        </div>
        <label class="order-dropzone"><input type="file" name="referenceFiles" data-order-file-input multiple accept="image/*,video/mp4,video/webm,.pdf,.doc,.docx,.txt,.zip"><span>${icon('upload')}</span><strong>Reference files</strong><small>Up to eight supported files, 8MB each.</small></label>
        <ul class="order-file-list" data-order-file-list aria-live="polite"></ul>
        <p class="order-note">Files are saved privately before secure checkout begins.</p>
      </div>
      <div class="order-wizard__panel" data-order-panel="3" hidden>
        <div class="order-wizard__heading"><span>Step 04</span><h3>Review and payment</h3></div>
        <div class="order-summary" data-order-summary></div>
        <label class="order-consent"><input type="checkbox" name="termsAccepted" required> <span>I agree to the <a href="/terms" data-nav>terms</a> and acknowledge the <a href="/privacy" data-nav>privacy notice</a>.</span></label>
      </div>
      <div class="order-wizard__panel" data-order-panel="4" hidden>
        <div class="order-wizard__heading"><span>Step 05</span><h3>Continue to secure checkout</h3></div>
        <div class="order-payment"><span class="sandbox-badge">Stripe test mode</span><p>Your request is saved before Stripe opens. A verified webhook—not the browser redirect—creates the paid order and project.</p><button class="button button--sun" type="button" data-order-checkout data-checkout="complete_revamp">Continue to Stripe ${icon('arrow')}</button><a href="/login" data-nav>Already purchased? Sign in for the private brief.</a></div>
      </div>
      <div class="order-wizard__actions"><button type="button" class="text-arrow" data-order-previous hidden>Back</button><p class="form-status" data-order-status role="status">Step 1 of 5</p><button type="button" class="button" data-order-next>Continue ${icon('arrow')}</button></div>
    </form>
  </div></section>`;
}
