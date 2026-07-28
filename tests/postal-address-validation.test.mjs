import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import {
  normalizePostalAddressCandidate,
  validateCompleteUsPostalAddress,
} from '../src/lib/postal-address.js';

test('the owner supplied candidate is recorded without pretending it is complete', () => {
  assert.equal(
    normalizePostalAddressCandidate('  Creek Hollow Ave, Zachary, Louisiana 70791  '),
    'Creek Hollow Ave, Zachary, Louisiana 70791',
  );
  const result = validateCompleteUsPostalAddress({
    streetLine1: 'Creek Hollow Ave',
    city: 'Zachary',
    region: 'LA',
    postalCode: '70791',
  });
  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ['street number']);
});

test('a complete structured US postal address passes without exposing unrelated data', () => {
  const result = validateCompleteUsPostalAddress({
    streetLine1: '123 Creek Hollow Ave',
    city: 'Zachary',
    region: 'LA',
    postalCode: '70791',
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.missing, []);
  assert.equal(result.formatted, '123 Creek Hollow Ave, Zachary, LA 70791');
});

test('outreach keeps the postal address unset until the owner supplies one later', async () => {
  const migrations = await readdir('supabase/migrations');
  const filename = migrations.find((name) => name.endsWith('_clear_postal_address_candidate.sql'));
  assert.ok(filename, 'missing migration that clears the postal address candidate');
  const [sql, privateCommandCenterSpec, creativeCommandCenterSpec] = await Promise.all([
    readFile(`supabase/migrations/${filename}`, 'utf8'),
    readFile('docs/superpowers/specs/2026-07-27-private-owner-command-center-design.md', 'utf8'),
    readFile('docs/superpowers/specs/2026-07-27-creative-review-command-center-design.md', 'utf8'),
  ]);
  assert.match(sql, /postal_address_candidate\s*=\s*null/i);
  assert.match(sql, /sending_enabled\s*=\s*false/i);
  assert.match(privateCommandCenterSpec, /postal address is intentionally unset/i);
  assert.match(creativeCommandCenterSpec, /postal address is intentionally unset/i);
});
