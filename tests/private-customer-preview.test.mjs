import assert from 'node:assert/strict';
import test from 'node:test';
import { renderWorkspace } from '../src/services/customer-workspace-renderer.js';

test('cinematic scene choices explain the included customer experience without exposing provider credits', async () => {
  const { cinematicSceneSelector } = await import('../src/components/cinematic-scene-selector.js');
  const html = cinematicSceneSelector();

  assert.match(html, /value="3">3 scenes/);
  assert.match(html, /value="4">4 scenes/);
  assert.match(html, /included in your plan/i);
  assert.match(html, /A scene is one full-screen visual moment/i);
  assert.doesNotMatch(html, /provider budget|credits?/i);
});

test('portfolio hero uses the compact AccessRevamp presentation', async () => {
  const { portfolioHero } = await import('../src/components/portfolio-hero.js');
  const html = portfolioHero();

  assert.match(html, /working-portfolio-hero__panel/);
  assert.match(html, /Built to be explored/);
});

test('private test projects render as evaluations and expose customer-visible findings in the Audit tab', () => {
  const html = renderWorkspace({
    profile: { full_name: 'Arya Selvaraj', email: 'vibespaceos@vibespaceos.com' },
    projects: [{
      id: 'project-1',
      order_id: null,
      name: 'UrBeauty evaluation test',
      website_url: 'https://urbeauty.store/',
      plan_key: 'homepage_reveal',
      status: 'client_review',
      progress_percent: 60,
      findings: [{
        id: 'finding-1',
        audit_type: 'conversion',
        severity: 'serious',
        confidence: 'verified',
        title: 'Clarify product proof',
        summary: 'Product benefits need clearer evidence.',
        evidence: 'The homepage presents products without demonstration context.',
        remediation: 'Add concise demonstration modules beside priority products.',
      }],
      updates: [],
      feedback: [],
      design_options: [],
      artifacts: [],
      deliveries: [],
    }],
  }, 'project-1', 'projects', 'audit');

  assert.match(html, /Private evaluation test/);
  assert.match(html, /data-project-tab="audit"/);
  assert.match(html, /Clarify product proof/);
  assert.match(html, /Evidence/);
  assert.match(html, /Recommended move/);
});

test('website review keeps an ordered top-three ranking and advances to the optional request step', () => {
  const html = renderWorkspace({
    profile: { full_name: 'Arya Selvaraj', email: 'vibespaceos@vibespaceos.com' },
    projects: [{
      id: 'project-1',
      order_id: null,
      name: 'UrBeauty evaluation test',
      plan_key: 'homepage_reveal',
      status: 'client_review',
      progress_percent: 60,
      findings: [],
      updates: [],
      feedback: [],
      artifacts: [],
      deliveries: [],
      design_options: [
        { id: 'option-1', option_group: 'homepage_normal', option_number: 1, revision_round: 0, preview_url: 'https://example.com/one.png' },
        { id: 'option-2', option_group: 'homepage_normal', option_number: 2, revision_round: 0, preview_url: 'https://example.com/two.png' },
      ],
    }],
  }, 'project-1', 'projects', 'website');

  assert.match(html, /First choice/);
  assert.match(html, /Second choice/);
  assert.match(html, /Third choice/);
  assert.match(html, /data-website-review-form/);
  assert.match(html, /Continue to special requests/);
});

test('the project workspace reduces the customer journey to Audit and Website, with a full-page pick-and-request flow', () => {
  const html = renderWorkspace({
    profile: { full_name: 'Arya Selvaraj', email: 'vibespaceos@vibespaceos.com' },
    projects: [{
      id: 'project-1',
      order_id: null,
      name: 'UrBeauty evaluation test',
      plan_key: 'homepage_reveal',
      status: 'client_review',
      progress_percent: 60,
      findings: [{ id: 'finding-1', audit_type: 'conversion', severity: 'serious', confidence: 'verified', title: 'Clarify product proof', summary: 'Proof needs work.', evidence: 'Homepage review.', remediation: 'Add proof.' }],
      updates: [],
      feedback: [],
      artifacts: [],
      deliveries: [],
      design_options: [
        { id: 'option-1', option_group: 'homepage_normal', option_number: 1, revision_round: 0, preview_url: 'https://example.com/one.png' },
        { id: 'option-2', option_group: 'homepage_normal', option_number: 2, revision_round: 0, preview_url: 'https://example.com/two.png' },
        { id: 'option-3', option_group: 'homepage_normal', option_number: 3, revision_round: 0, preview_url: 'https://example.com/three.png' },
        { id: 'option-4', option_group: 'homepage_normal', option_number: 4, revision_round: 0, preview_url: 'https://example.com/four.png' },
        { id: 'option-5', option_group: 'homepage_normal', option_number: 5, revision_round: 0, preview_url: 'https://example.com/five.png' },
        { id: 'poster-1', option_group: 'poster_animated', option_number: 1, revision_round: 0, preview_url: 'https://example.com/private-poster.mp4' },
      ],
    }],
  }, 'project-1', 'projects', 'website');

  assert.match(html, /data-project-tab="audit"/);
  assert.match(html, /data-project-tab="website"/);
  assert.doesNotMatch(html, /data-project-tab="updates"|data-project-tab="progress"|data-project-tab="brief"|data-project-tab="designs"|data-project-tab="requests"|data-project-tab="files"/);
  assert.match(html, /data-website-review-form/);
  assert.match(html, /Continue to special requests/);
  assert.match(html, /Animated poster previews/);
  assert.match(html, /<video src="https:\/\/example\.com\/private-poster\.mp4"[^>]*loop muted playsinline controls/);
  assert.doesNotMatch(html, /canva\.com/);
  assert.equal((html.match(/alt="Homepage option/g) || []).length, 5);
});

test('a saved homepage ranking advances the Website tab to an optional special-request step', () => {
  const html = renderWorkspace({
    profile: { full_name: 'Arya Selvaraj', email: 'vibespaceos@vibespaceos.com' },
    projects: [{
      id: 'project-1', order_id: null, name: 'UrBeauty evaluation test', plan_key: 'homepage_reveal', status: 'client_review', progress_percent: 60,
      findings: [], updates: [], artifacts: [], deliveries: [],
      feedback: [{ action: 'select_designs', option_group: 'homepage_normal', revision_round: 0, selected_option_ids: ['option-1'] }],
      design_options: [{ id: 'option-1', option_group: 'homepage_normal', option_number: 1, revision_round: 0, preview_url: 'https://example.com/one.png' }],
    }],
  }, 'project-1', 'projects', 'website');

  assert.match(html, /Any special requests\?/);
  assert.match(html, /Finish for now/);
  assert.doesNotMatch(html, /name="notes"[^>]+required/);
});
