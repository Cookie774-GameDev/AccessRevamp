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
