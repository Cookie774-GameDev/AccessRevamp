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

test('private test projects render as evaluations and expose customer-visible findings in a digestible insights tab', () => {
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
  }, 'project-1', 'projects', 'insights');

  assert.match(html, /Private evaluation test/);
  assert.match(html, /data-project-tab="insights"/);
  assert.match(html, /Clarify product proof/);
  assert.match(html, /Evidence/);
  assert.match(html, /Recommended move/);
});

test('design review keeps an ordered top-three ranking and explains the next creative step', () => {
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
  }, 'project-1', 'projects', 'designs');

  assert.match(html, /First choice/);
  assert.match(html, /Second choice/);
  assert.match(html, /Third choice/);
  assert.match(html, /Next: Canva directions/);
});
