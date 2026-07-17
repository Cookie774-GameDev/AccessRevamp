import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('supabase/migrations/202607170001_accessrevamp.sql', 'utf8');

test('outreach is capped at twenty and requires active human approval', () => {
  assert.match(sql, /v_daily_approved >= 20/);
  assert.match(sql, /daily outreach approval limit of 20 reached/i);
  assert.match(sql, /human approval is required before outreach can advance/i);
  assert.match(sql, /staff\.active = true/);
  assert.match(sql, /follow_up_count between 0 and 1/);
});

test('verified evidence, private previews, provenance, and suppression are enforced', () => {
  assert.match(sql, /human_verified_at is not null/);
  assert.match(sql, /finding\.confidence = 'verified'/);
  assert.match(sql, /preview\.noindex = true/);
  assert.match(sql, /recipient is suppressed/i);
  assert.match(sql, /contact_source_url text not null/);
});

test('customer tables have RLS and security-invoker compatibility views', () => {
  assert.match(sql, /alter table public\.ar_profiles enable row level security/);
  assert.match(sql, /ar_profiles_select_own/);
  assert.match(sql, /ar_orders_select_own/);
  assert.match(sql, /ar_projects_select_own/);
  assert.match(sql, /with \(security_invoker = true\)/);
});

test('application objects are isolated from unrelated public tables', () => {
  assert.match(sql, /create table if not exists public\.ar_orders/);
  assert.match(sql, /create table if not exists public\.ar_outreach_messages/);
  assert.doesNotMatch(sql, /create table if not exists public\.orders\b/);
  assert.doesNotMatch(sql, /create table if not exists public\.profiles\b/);
  assert.doesNotMatch(sql, /create table if not exists public\.outreach_queue\b/);
});
