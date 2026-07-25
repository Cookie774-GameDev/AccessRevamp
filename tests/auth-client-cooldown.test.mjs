import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authRequestKey,
  cooldownSeconds,
  parseRetryAfterSeconds,
} from '../src/services/auth-guards.js';

test('authentication request keys normalize email and separate each ceremony', () => {
  assert.equal(authRequestKey('signup', ' Customer@Example.COM '), 'signup:customer@example.com');
  assert.notEqual(authRequestKey('signup', 'customer@example.com'), authRequestKey('login', 'customer@example.com'));
});

test('retry windows prefer structured API data and safely parse provider messages', () => {
  assert.equal(parseRetryAfterSeconds({ retryAfter: 41 }), 41);
  assert.equal(parseRetryAfterSeconds({ error: 'You can only request this after 33 seconds.' }), 33);
  assert.equal(parseRetryAfterSeconds({}, 60), 60);
  assert.equal(parseRetryAfterSeconds({ retryAfter: 99999 }), 3600);
});

test('countdown rounds up and reaches zero deterministically', () => {
  assert.equal(cooldownSeconds(10_001, 10_000), 1);
  assert.equal(cooldownSeconds(10_999, 10_000), 1);
  assert.equal(cooldownSeconds(11_001, 10_000), 2);
  assert.equal(cooldownSeconds(9_999, 10_000), 0);
});
