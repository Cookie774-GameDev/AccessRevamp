import { escapeHtml } from '../components/icons.js';
import { shell } from '../components/shell.js';

export function projectApprovalPage({ token = '' } = {}) {
  return shell(`<section class="page-hero"><div class="container-narrow" data-project-approval data-approval-token="${escapeHtml(token)}">
    <span class="eyebrow">Private customer approval</span>
    <h1>Review your AccessRevamp options.</h1>
    <p class="lede">This link is unique, expires automatically, and can be used only once.</p>
    <div class="order-summary" data-approval-summary aria-live="polite"><p>Loading your project options…</p></div>
    <form class="order-wizard" data-approval-form hidden>
      <fieldset data-approval-options><legend>Choose one option</legend><div class="order-plan-grid" data-approval-option-grid></div></fieldset>
      <label>Optional notes<textarea name="notes" rows="5" maxlength="2000" placeholder="Tell us what you like or what must change."></textarea></label>
      <label class="order-consent"><input type="checkbox" name="confirm" required> <span>I confirm this selection for the project shown above.</span></label>
      <button class="button button--sun" type="submit">Confirm selection</button>
      <p class="form-status" data-approval-status role="status"></p>
    </form>
  </div></section>`, { pathname: '/approve' });
}
