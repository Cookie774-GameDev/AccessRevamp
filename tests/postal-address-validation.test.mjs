import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizePostalAddressCandidate,
  validateCompleteUsPostalAddress,
} from '../src/lib/postal-address.js';

test('the owner supplied candidate is recorded without pretending it is complete', () => {
  assert.equal(
    normalizePostalAddressCandidate('  Creek Hollow Ave   Zachary  '),
    'Creek Hollow Ave Zachary',
  );
  const result = validateCompleteUsPostalAddress({
    streetLine1: 'Creek Hollow Ave',
    city: 'Zachary',
    region: '',
    postalCode: '',
  });
  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ['street number', 'state', 'ZIP code']);
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

