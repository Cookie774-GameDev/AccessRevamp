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
  assert.match(page, /data-account-profile/);
  assert.match(client, /customer-workspace__rail/);
  assert.match(client, /data-project-select/);
  assert.match(client, /selectedProjectId/);
  assert.match(client, /projects\.find\(\(project\) => project\.id === selectedProjectId\)/);
  assert.doesNotMatch(client, /projects\.map\(renderProject\)/);
  assert.match(styles, /\.customer-workspace/);
  assert.match(styles, /\.customer-workspace__rail/);
  assert.match(styles, /\.customer-workspace__canvas/);
});

test('the focused project keeps questions progress designs requests and delivery together', async () => {
  const client = await read('src/services/account-projects.js');

  assert.match(client, /Next action/);
  assert.match(client, /Project questions and references/);
  assert.match(client, /Production progress/);
  assert.match(client, /Designs for review/);
  assert.match(client, /Special requests/);
  assert.match(client, /Files and website downloads/);
});

test('the authenticated workspace renders compact application and project tabs', async () => {
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

  for (const tab of ['overview', 'projects', 'settings']) {
    assert.match(html, new RegExp(`data-workspace-tab="${tab}"`));
  }
  for (const tab of ['updates', 'progress', 'brief', 'designs', 'requests', 'files']) {
    assert.match(html, new RegExp(`data-project-tab="${tab}"`));
  }
  assert.match(html, /Change password with a verification code/);
  assert.match(html, /\/forgot-password\?email=customer%40example\.com/);
});

test('signed-out and privacy states remain readable on the light workspace', async () => {
  const css = await readFile('src/styles/customer-hub.css', 'utf8');
  assert.match(css, /\.customer-hub-page\s*\{[\s\S]*background:\s*#f6f0e4/);
  assert.match(css, /\.customer-dashboard-tabs/);
  assert.match(css, /\.customer-project-tabs/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*overflow-x:\s*auto/);
});
