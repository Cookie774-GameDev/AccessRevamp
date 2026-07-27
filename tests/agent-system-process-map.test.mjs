import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('docs/agent-system/PROCESS_MAP.html', 'utf8');

test('process map documents the complete bounded agent system', () => {
  assert.match(html, /Avery/);
  assert.match(html, /Jordan/);
  assert.match(html, /Kasey/);
  assert.match(html, /Riley/);
  assert.match(html, /Morgan/);
  assert.match(html, /20 mailboxes each/i);
  assert.match(html, /Worker 6/i);
  assert.match(html, /15 minutes/i);
  assert.match(html, /Gmail message ID/i);
  assert.match(html, /original Icemail mailbox/i);
  assert.match(html, /support@accessrevamp\.shop/i);
  assert.match(html, /Stripe signed webhook/i);
  assert.match(html, /Supabase/i);
  assert.match(html, /SOURCE_ASSET_MANIFEST\.md/i);
  assert.match(html, /SKILL\.md/i);
  assert.match(html, /DESIGN\.md/i);
  assert.match(html, /\$50/);
  assert.match(html, /\$200/);
  assert.match(html, /\$250/);
  assert.match(html, /human review/i);
  assert.match(html, /reduced motion/i);
});

test('process map is standalone, accessible, responsive, and interactive', () => {
  assert.match(html, /<meta name="viewport"/i);
  assert.match(html, /prefers-reduced-motion/i);
  assert.match(html, /aria-pressed/i);
  assert.match(html, /data-lane/i);
  assert.match(html, /<script>/i);
  assert.doesNotMatch(html, /https?:\/\/[^<"']+\.(?:js|css)/i);
});
