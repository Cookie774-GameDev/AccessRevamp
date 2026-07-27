import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(path, 'utf8');

test('the customer hub presents one selected project inside an application workspace', async () => {
  const [page, client, styles] = await Promise.all([
    read('src/pages/account-projects.js'),
    read('src/services/account-projects.js'),
    read('src/styles/customer-hub.css'),
  ]);

  assert.match(page, /Project workspace/);
  assert.doesNotMatch(page, /data-account-profile/);
  assert.match(client, /customer-workspace__rail/);
  assert.match(client, /data-project-select/);
  assert.match(client, /selectedProjectId/);
  assert.match(client, /projects\.find\(\(project\) => project\.id === selectedProjectId\)/);
  assert.doesNotMatch(client, /projects\.map\(renderProject\)/);
  assert.match(styles, /\.customer-workspace/);
  assert.match(styles, /\.customer-workspace__rail/);
  assert.match(styles, /\.customer-workspace__canvas/);
});

test('the focused project keeps its customer journey in the Audit and Website tabs', async () => {
  const renderer = await read('src/services/customer-workspace-renderer.js');

  assert.match(renderer, /\['audit', 'Audit'\]/);
  assert.match(renderer, /\['website', 'Website'\]/);
  assert.match(renderer, /data-open-design-chooser/);
  assert.match(renderer, /renderDesignChooser/);
  assert.match(renderer, /Any special instructions\?/);
});

test('the authenticated workspace opens on projects and keeps settings without a generic overview', async () => {
  const workspace = await import('../src/services/customer-workspace-renderer.js').catch(() => ({}));
  assert.equal(typeof workspace.renderWorkspace, 'function');
  const html = workspace.renderWorkspace({
    profile: { full_name: 'Customer Name', email: 'customer@example.com' },
    projects: [{
      id: 'project-1',
      name: 'Store redesign',
      plan_key: 'complete_revamp',
      status: 'active',
      delivery_status: 'pending',
      progress_percent: 25,
      updates: [],
      feedback: [],
      design_options: [],
      artifacts: [],
      deliveries: [],
    }],
    orders: [],
    refundRequests: [],
    signedUrlExpiresIn: 900,
  }, 'project-1', 'projects');

  for (const tab of ['projects', 'settings']) {
    assert.match(html, new RegExp(`data-workspace-tab="${tab}"`));
  }
  assert.doesNotMatch(html, /data-workspace-tab="overview"/);
  assert.doesNotMatch(html, /Current entitlement/);
  for (const tab of ['audit', 'website']) {
    assert.match(html, new RegExp(`data-project-tab="${tab}"`));
  }
  assert.match(html, /Change password with a verification code/);
  assert.match(html, /\/forgot-password\?email=customer%40example\.com/);
  assert.match(html, /data-settings-signout/);
  assert.match(html, /data-signout-confirm/);
});

test('client review progress cannot be behind an older published percentage', async () => {
  const module = await import('../netlify/functions/account-projects.mjs');
  assert.equal(typeof module.calculateProgress, 'function');
  assert.equal(module.calculateProgress(
    { status: 'client_review' },
    [],
    [{ progress_percent: 60 }],
  ), 85);
});

test('project progress names plan-aware checkpoints and the current customer action', async () => {
  const workspace = await import('../src/services/customer-workspace-renderer.js');
  const html = workspace.renderWorkspace({
    profile: { email: 'customer@example.com' },
    projects: [{
      id: 'project-progress',
      name: 'Store redesign',
      plan_key: 'complete_revamp',
      status: 'client_review',
      progress_percent: 85,
      workflow: { current_stage: 'client_review', tasks: [] },
      updates: [],
      feedback: [],
      design_options: [],
      artifacts: [],
      deliveries: [],
      findings: [],
    }],
  }, 'project-progress', 'projects');

  assert.match(html, /data-progress-milestone="client_review"/);
  assert.match(html, /aria-current="step"[^>]*>[\s\S]*Client review/);
  assert.match(html, /data-progress-milestone="implementation"/);
  assert.match(html, /Website build/);
  assert.match(html, /85% complete/);
});

test('the design selector supports enlargement, step back, and visual final confirmation', async () => {
  const workspace = await import('../src/services/customer-workspace-renderer.js');
  const designOptions = [
    { id: 'option-a', option_group: 'homepage_normal', option_number: 1, revision_round: 0, preview_url: 'https://assets.example/one.webp', prompt_summary: 'Editorial ritual' },
    { id: 'option-b', option_group: 'homepage_normal', option_number: 2, revision_round: 0, preview_url: 'https://assets.example/two.webp', prompt_summary: 'Clean beauty studio' },
    { id: 'option-c', option_group: 'homepage_normal', option_number: 3, revision_round: 0, preview_url: 'https://assets.example/three.webp', prompt_summary: 'Product-led story' },
    { id: 'option-d', option_group: 'homepage_normal', option_number: 4, revision_round: 0, preview_url: 'https://assets.example/four.webp', prompt_summary: 'Soft storefront' },
  ];
  const project = {
    id: 'project-design',
    name: 'Store redesign',
    plan_key: 'complete_revamp',
    status: 'client_review',
    progress_percent: 85,
    workflow: { current_stage: 'client_review', tasks: [] },
    updates: [],
    feedback: [],
    design_options: designOptions,
    artifacts: [],
    deliveries: [],
    findings: [],
  };

  const rankingHtml = workspace.renderWorkspace(
    { projects: [project] },
    project.id,
    'projects',
    'website',
    { designChooser: { open: true, rankedOptionIds: ['option-a'] } },
  );
  assert.match(rankingHtml, /data-design-preview-open="option-b"/);
  assert.match(rankingHtml, /Enlarge preview/);
  assert.match(rankingHtml, /data-design-chooser-back/);

  const confirmationHtml = workspace.renderWorkspace(
    { projects: [project] },
    project.id,
    'projects',
    'website',
    { designChooser: { open: true, rankedOptionIds: ['option-a', 'option-b', 'option-c'] } },
  );
  assert.match(confirmationHtml, /design-chooser__review-grid/);
  assert.match(confirmationHtml, /First choice/);
  assert.match(confirmationHtml, /Second choice/);
  assert.match(confirmationHtml, /Third choice/);
  assert.match(confirmationHtml, /src="https:\/\/assets\.example\/one\.webp"/);
  assert.match(confirmationHtml, /src="https:\/\/assets\.example\/two\.webp"/);
  assert.match(confirmationHtml, /src="https:\/\/assets\.example\/three\.webp"/);
});

test('audit cards expose plain-language category marks and exact cited pages', async () => {
  const workspace = await import('../src/services/customer-workspace-renderer.js');
  const html = workspace.renderWorkspace({
    projects: [{
      id: 'project-audit',
      name: 'Store audit',
      plan_key: 'homepage_reveal',
      status: 'reviewing',
      progress_percent: 30,
      updates: [],
      feedback: [],
      design_options: [{
        id: 'poster-1',
        option_group: 'poster_animated',
        option_number: 1,
        revision_round: 0,
        preview_url: 'https://assets.example/poster.mp4',
        prompt_summary: 'Five-second vertical motion poster with a gentle loop and approved product imagery.',
      }],
      artifacts: [],
      deliveries: [],
      findings: [{
        audit_type: 'content',
        severity: 'moderate',
        confidence: 'verified',
        title: 'Clarify the return promise',
        summary: 'The promise and the full policy should agree.',
        evidence: 'The product page links to the current policy.',
        remediation: 'Use the same timing and conditions everywhere.',
        source_title: 'UrBeauty refund policy',
        source_url: 'https://urbeauty.store/policies/refund-policy',
      }],
    }],
  }, 'project-audit', 'projects', 'audit');

  assert.match(html, /portal-insight-group__mark/);
  assert.match(html, /UrBeauty refund policy/);
  assert.match(html, /href="https:\/\/urbeauty\.store\/policies\/refund-policy"/);
  assert.match(html, /Open cited page/);
  assert.match(html, /portal-design-card__summary/);
});

test('signed-out and privacy states remain readable on the light workspace', async () => {
  const css = await readFile('src/styles/customer-hub.css', 'utf8');
  assert.match(css, /\.customer-hub-page\s*\{[\s\S]*background:\s*#f6f0e4/);
  assert.match(css, /\.customer-dashboard-tabs/);
  assert.match(css, /\.customer-project-tabs/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*overflow-x:\s*auto/);
});
