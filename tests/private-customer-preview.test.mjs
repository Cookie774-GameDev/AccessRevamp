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

test('website review starts the guided ranking experience from one clear action', () => {
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

  assert.match(html, /data-open-design-chooser/);
  assert.match(html, /Choose website design/);
  assert.doesNotMatch(html, /data-website-review-form/);
});

test('a project with ready design options opens directly on the Website review', () => {
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
      design_options: [{ id: 'option-1', option_group: 'homepage_normal', option_number: 1, revision_round: 0, preview_url: 'https://example.com/one.png' }],
    }],
  }, 'project-1', 'projects');

  assert.match(html, /data-project-tab="website" aria-selected="true"/);
  assert.match(html, /data-project-panel="audit" hidden/);
  assert.doesNotMatch(html, /data-project-panel="website" hidden/);
});

test('Website review keeps ready animated posters visible alongside the selector entry point', () => {
  const html = renderWorkspace({
    profile: { full_name: 'Arya Selvaraj', email: 'vibespaceos@vibespaceos.com' },
    projects: [{
      id: 'project-1', order_id: null, name: 'UrBeauty evaluation test', plan_key: 'homepage_reveal', status: 'client_review', progress_percent: 60,
      findings: [], updates: [], feedback: [], artifacts: [], deliveries: [],
      design_options: [
        { id: 'option-1', option_group: 'homepage_normal', option_number: 1, revision_round: 0, preview_url: 'https://example.com/one.png' },
        { id: 'poster-1', option_group: 'poster_animated', option_number: 1, revision_round: 0, preview_url: 'https://example.com/poster.mp4' },
      ],
    }],
  }, 'project-1', 'projects', 'website');

  assert.match(html, /Animated poster previews/);
  assert.match(html, /data-open-design-chooser/);
});

test('private website previews identify themselves for signed-link recovery', () => {
  const html = renderWorkspace({
    profile: { full_name: 'Arya Selvaraj', email: 'vibespaceos@vibespaceos.com' },
    projects: [{
      id: 'project-1', order_id: null, name: 'UrBeauty evaluation test', plan_key: 'homepage_reveal', status: 'client_review', progress_percent: 60,
      findings: [], updates: [], feedback: [], artifacts: [], deliveries: [],
      design_options: [
        { id: 'option-1', option_group: 'homepage_normal', option_number: 1, revision_round: 0, preview_url: 'https://example.com/one.png' },
        { id: 'poster-1', option_group: 'poster_animated', option_number: 1, revision_round: 0, preview_url: 'https://example.com/poster.mp4' },
      ],
    }],
  }, 'project-1', 'projects', 'website', { designChooserOpen: true, rankedOptionIds: [] });

  assert.match(html, /<img[^>]+data-signed-preview/);
  assert.match(html, /<video[^>]+data-signed-preview/);
});

test('the website chooser presents a full-screen guided ranking sequence', () => {
  const html = renderWorkspace({
    profile: { full_name: 'Arya Selvaraj', email: 'vibespaceos@vibespaceos.com' },
    projects: [{
      id: 'project-1', order_id: null, name: 'UrBeauty evaluation test', plan_key: 'homepage_reveal', status: 'client_review', progress_percent: 60,
      findings: [], updates: [], feedback: [], artifacts: [], deliveries: [],
      design_options: [
        { id: 'option-1', option_group: 'homepage_normal', option_number: 1, revision_round: 0, preview_url: 'https://example.com/one.png' },
        { id: 'option-2', option_group: 'homepage_normal', option_number: 2, revision_round: 0, preview_url: 'https://example.com/two.png' },
        { id: 'option-3', option_group: 'homepage_normal', option_number: 3, revision_round: 0, preview_url: 'https://example.com/three.png' },
        { id: 'option-4', option_group: 'homepage_normal', option_number: 4, revision_round: 0, preview_url: 'https://example.com/four.png' },
        { id: 'option-5', option_group: 'homepage_normal', option_number: 5, revision_round: 0, preview_url: 'https://example.com/five.png' },
      ],
    }],
  }, 'project-1', 'projects', 'website', { designChooserOpen: true, rankedOptionIds: ['option-1', 'option-2'] });

  assert.match(html, /data-design-chooser/);
  assert.match(html, /Pick your third favorite/);
  assert.match(html, /data-design-rank-option="option-3"/);
  assert.match(html, /1 Favorite/);
  assert.match(html, /4 Instructions/);
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
  assert.match(html, /data-open-design-chooser/);
  assert.match(html, /Choose website design/);
  assert.match(html, /Animated poster previews/);
  assert.match(html, /<video[^>]*src="https:\/\/example\.com\/private-poster\.mp4"[^>]*loop muted playsinline controls/);
  assert.doesNotMatch(html, /canva\.com/);
  assert.equal((html.match(/alt="Homepage option/g) || []).length, 0);
});

test('a saved homepage ranking keeps the guided selection entry point available', () => {
  const html = renderWorkspace({
    profile: { full_name: 'Arya Selvaraj', email: 'vibespaceos@vibespaceos.com' },
    projects: [{
      id: 'project-1', order_id: null, name: 'UrBeauty evaluation test', plan_key: 'homepage_reveal', status: 'client_review', progress_percent: 60,
      findings: [], updates: [], artifacts: [], deliveries: [],
      feedback: [{ action: 'select_designs', option_group: 'homepage_normal', revision_round: 0, selected_option_ids: ['option-1'] }],
      design_options: [{ id: 'option-1', option_group: 'homepage_normal', option_number: 1, revision_round: 0, preview_url: 'https://example.com/one.png' }],
    }],
  }, 'project-1', 'projects', 'website');

  assert.match(html, /data-open-design-chooser/);
  assert.match(html, /Choose website design/);
});
