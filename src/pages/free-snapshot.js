import { shell } from '../components/shell.js';

export function freeSnapshotPage() {
  return shell(`<section class="section page-hero page-hero--mint"><div class="container-narrow">
    <span class="eyebrow">Free Snapshot / manual review</span>
    <h1>One public finding, reviewed by a person.</h1>
    <p class="lede">Share one public HTTPS page and enough context to understand the customer task. We will not crawl private areas, run active security tests, or promise an instant result.</p>
  </div></section>
  <section class="section"><div class="container-narrow form-layout">
    <div><h2>Request the snapshot</h2><p>Submission places the page in a manual-review queue. Follow-up is limited to this request unless you separately choose otherwise.</p></div>
    <form class="panel form-stack" data-free-snapshot novalidate>
      <div class="form-status" data-snapshot-status role="status" aria-live="polite"></div>
      <label>Public website page <input name="websiteUrl" type="url" inputmode="url" required maxlength="2048" placeholder="https://example.com/"></label>
      <label>Contact email <input name="contactEmail" type="email" autocomplete="email" required maxlength="254"></label>
      <label>Business context <textarea name="businessContext" required minlength="20" maxlength="1200" rows="5" placeholder="What should a visitor understand or do on this page?"></textarea></label>
      <label class="check-row"><input name="consent" type="checkbox" required> <span>I consent to AccessRevamp reviewing this public page and emailing me about this request.</span></label>
      <button class="button" type="submit">Request manual review</button>
      <p class="fine-print">Do not include passwords, customer data, access credentials, or private URLs.</p>
    </form>
  </div></section>`, { pathname: '/free-snapshot' });
}
