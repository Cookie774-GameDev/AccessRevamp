import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Worker 6 runs every fifteen minutes without overlap', async () => {
  const installer = await readFile(new URL('../scripts/worker6/install-worker6-schedule.ps1', import.meta.url), 'utf8');
  const verifier = await readFile(new URL('../scripts/worker6/verify-worker6-schedule.ps1', import.meta.url), 'utf8');
  assert.match(installer, /New-TimeSpan -Minutes 15/);
  assert.match(installer, /IgnoreNew/);
  assert.match(installer, /AccessRevamp-Worker6/);
  assert.match(installer, /npm run email:worker6/);
  assert.match(installer, /ExecutionTimeLimit.*Minutes 5/);
  assert.match(verifier, /ExecutionTimeLimit>PT5M/);
});
