import assert from 'node:assert/strict';
import test from 'node:test';
import { authPage } from '../src/pages/auth.js';
import { recoveryPage } from '../src/pages/recovery.js';

const otpModule = await import('../src/services/otp.js').catch(() => ({}));

test('email OTP inputs accept Supabase eight-digit codes without truncation', () => {
  const signup = authPage('signup');
  const recovery = recoveryPage();

  for (const page of [signup, recovery]) {
    assert.match(page, /pattern="\[0-9\]\{6,8\}"/);
    assert.match(page, /minlength="6"/);
    assert.match(page, /maxlength="8"/);
  }

  assert.equal(typeof otpModule.normalizeEmailOtp, 'function');
  assert.equal(otpModule.normalizeEmailOtp('29 320-378'), '29320378');
  assert.equal(otpModule.isEmailOtp('29320378'), true);
  assert.equal(otpModule.isEmailOtp('293203'), true);
  assert.equal(otpModule.isEmailOtp('29320'), false);
});
