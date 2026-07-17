import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  'supabase/migrations/202607170007_index_internal_foreign_keys.sql',
  'utf8',
);

test('outreach prospect lookups have a covering index', () => {
  assert.match(
    sql,
    /create index if not exists outreach_queue_prospect_created_idx[\s\S]*on public\.outreach_queue \(prospect_id, created_at desc\)/,
  );
});

test('audit actor lookups have a covering index', () => {
  assert.match(
    sql,
    /create index if not exists accessrevamp_audit_log_actor_created_idx[\s\S]*on public\.accessrevamp_audit_log \(actor_id, created_at desc\)/,
  );
});
