import test from 'node:test';
import assert from 'node:assert/strict';
import { assertOutreachDraft } from '../scripts/lib/outreach-guardrails.mjs';

const safeDraft = {
  subject: 'One homepage accessibility observation for Example Store',
  bodyText: 'I reviewed the public homepage at store.example and verified one focus-visibility issue. The private concept is included for your review.',
  reviewedDomain: 'store.example',
};

test('individualized factual outreach is accepted', () => {
  assert.equal(assertOutreachDraft(safeDraft), true);
});

test('fake reply subjects are rejected', () => {
  assert.throws(
    () => assertOutreachDraft({ ...safeDraft, subject: 'Re: your homepage' }),
    /reply or forward/i,
  );
});

test('URL shorteners and misleading partnership claims are rejected', () => {
  assert.throws(
    () => assertOutreachDraft({ ...safeDraft, bodyText: 'We partnered with your store. See store.example at bit.ly/example.' }),
    /URL-shortening|partnership/i,
  );
});

test('security, legal, and unsupported revenue scare claims are rejected', () => {
  assert.throws(
    () => assertOutreachDraft({ ...safeDraft, bodyText: 'store.example has security vulnerabilities and could be sued.' }),
    /scare claims/i,
  );
});

test('the reviewed business domain must stay in the final body', () => {
  assert.throws(
    () => assertOutreachDraft({ ...safeDraft, bodyText: 'I reviewed your public homepage.' }),
    /domain must appear/i,
  );
});
