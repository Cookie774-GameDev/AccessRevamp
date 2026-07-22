import assert from 'node:assert/strict';

const DEFAULT_SUPABASE_URL = 'https://vbkkimvedmklebghtkzs.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WD8hNud9SZMDg6uK0N2cAA_4hnxz2ta';

const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
const key = process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

const response = await fetch(`${url}/auth/v1/settings`, {
  headers: {
    apikey: key,
    authorization: `Bearer ${key}`,
    'x-application-name': 'accessrevamp-public-auth-check',
  },
  signal: AbortSignal.timeout(15_000),
});

assert.equal(response.ok, true, `Supabase Auth settings returned HTTP ${response.status}.`);
const settings = await response.json();
assert.equal(settings?.external?.email, true, 'Supabase email authentication is disabled.');
assert.equal(settings?.disable_signup, false, 'Supabase public signup is disabled.');
assert.equal(settings?.mailer_autoconfirm, false, 'Supabase email confirmation is not required.');

console.log(JSON.stringify({
  projectUrl: url,
  reachable: true,
  emailProviderEnabled: settings.external.email,
  signupEnabled: !settings.disable_signup,
  emailConfirmationRequired: !settings.mailer_autoconfirm,
  credentialsPrinted: false,
}, null, 2));
