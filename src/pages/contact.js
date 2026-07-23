import { siteConfig } from '../config.js';
import { escapeHtml, icon } from '../components/icons.js';
import { shell } from '../components/shell.js';

const offers = [
  ['free_snapshot', 'Free Snapshot'],
  ['homepage_reveal', '$50 Homepage Reveal'],
  ['complete_revamp', '$200 Complete Website Revamp'],
  ['cinematic_scroll', '$250 Cinematic Scroll Site'],
];

export function readContactInterest(search = globalThis.location?.search || '') {
  const interest = new URLSearchParams(search).get('interest');
  return offers.some(([value]) => value === interest) ? interest : '';
}

export function contactPage() {
  const selected = readContactInterest();
  const email = siteConfig.contactEmail ? `<p>Prefer email? <a href="mailto:${escapeHtml(siteConfig.contactEmail)}">${escapeHtml(siteConfig.contactEmail)}</a></p>` : '';
  const options = offers.map(([value, label]) => `<option value="${value}"${selected === value ? ' selected' : ''}>${label}</option>`).join('');
  return shell(`
    <section class="page-hero"><div class="container-wide page-hero__split"><div><span class="eyebrow">Contact AccessRevamp</span><h1>What should your website make easier?</h1></div><div class="page-hero__aside"><p class="lede">Share a public URL and the outcome you care about. Never send passwords, access tokens, private customer data, or payment details.</p>${email}</div></div></section>
    <section class="section"><div class="container-wide contact-layout">
      <aside class="contact-aside"><span class="eyebrow">What happens next</span><h2>One public site. One real goal.</h2><ol><li>Your request is validated and recorded.</li><li>A person reviews the public page and stated goal.</li><li>You receive the next-step boundary by email.</li></ol><div class="privacy-note">Requests are rate-limited and stored through a protected server process after deployment configuration.</div></aside>
      <form class="contact-form" data-contact-form novalidate>
        <label>Selected offer<select name="interest"><option value="">Choose an offer</option>${options}</select></label>
        <div class="field-row"><label>First name<input name="firstName" autocomplete="given-name" maxlength="80" required></label><label>Last name<input name="lastName" autocomplete="family-name" maxlength="80"></label></div>
        <label>Business email<input type="email" name="email" autocomplete="email" maxlength="254" required></label>
        <label>Public website URL<input type="url" name="websiteUrl" inputmode="url" placeholder="https://" maxlength="2048" required></label>
        <label>Primary business goal<textarea name="message" rows="7" minlength="20" maxlength="4000" required></textarea></label>
        <label class="honeypot" aria-hidden="true">Company fax<input name="companyFax" tabindex="-1" autocomplete="off"></label>
        <label class="consent"><input type="checkbox" name="consent" required><span>I agree that AccessRevamp may reply to this request. This does not subscribe me to marketing.</span></label>
        <button class="button" type="submit">Send the request ${icon('arrow')}</button><p class="form-status" role="status" aria-live="polite"></p>
      </form>
    </div></section>`, { pathname: '/contact' });
}
