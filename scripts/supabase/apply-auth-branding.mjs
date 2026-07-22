import { readFile } from 'node:fs/promises';

const API_ORIGIN = 'https://api.supabase.com';
const PRODUCTION_SITE_URL = 'https://accessrevamp.com';
const EMAIL_OTP_SECONDS = 10 * 60;
const root = new URL('../../', import.meta.url);

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function projectRef() {
  const explicit = String(process.env.SUPABASE_PROJECT_REF || '').trim();
  if (explicit) return explicit;
  const rawUrl = String(process.env.SUPABASE_URL || '').trim();
  if (!rawUrl) throw new Error('SUPABASE_PROJECT_REF or SUPABASE_URL is required.');
  const hostname = new URL(rawUrl).hostname;
  const match = hostname.match(/^([a-z0-9-]+)\.supabase\.co$/i);
  if (!match) throw new Error('SUPABASE_URL does not contain a hosted Supabase project reference.');
  return match[1];
}

function secureSiteUrl() {
  const value = String(
    process.env.SUPABASE_AUTH_SITE_URL
    || process.env.ACCESSREVAMP_SITE_URL
    || process.env.VITE_SITE_URL
    || PRODUCTION_SITE_URL,
  ).trim().replace(/\/$/, '');
  const url = new URL(value);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('The Auth site URL must use HTTPS.');
  }
  if (process.env.CI && ['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('Hosted Auth cannot be configured with a localhost Site URL in CI.');
  }
  return url.toString().replace(/\/$/, '');
}

function productionOrigins(siteUrl) {
  const current = new URL(siteUrl);
  const origins = new Set([current.origin]);
  if (current.hostname === 'accessrevamp.com') origins.add('https://www.accessrevamp.com');
  if (current.hostname === 'www.accessrevamp.com') origins.add('https://accessrevamp.com');
  return [...origins];
}

function redirectAllowList(siteUrl) {
  const configured = String(process.env.SUPABASE_AUTH_REDIRECT_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const defaults = productionOrigins(siteUrl).flatMap((origin) => [
    `${origin}/login`,
    `${origin}/signup`,
    `${origin}/account/projects`,
    `${origin}/reset-password`,
    // Compatibility only for verification links issued before the OTP rollout.
    `${origin}/login?confirmed=1`,
    `${origin}/login?verification=*`,
  ]);
  return [...new Set([...configured, ...defaults])].join(',');
}

function smtpPayload() {
  const names = [
    'SUPABASE_SMTP_ADMIN_EMAIL',
    'SUPABASE_SMTP_HOST',
    'SUPABASE_SMTP_PORT',
    'SUPABASE_SMTP_USER',
    'SUPABASE_SMTP_PASS',
  ];
  const values = Object.fromEntries(names.map((name) => [name, String(process.env[name] || '').trim()]));
  const supplied = names.filter((name) => values[name]);
  if (!supplied.length) return {};
  if (supplied.length !== names.length) {
    throw new Error('All SUPABASE_SMTP_* credentials are required when enabling custom SMTP.');
  }
  const port = Number(values.SUPABASE_SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SUPABASE_SMTP_PORT is invalid.');
  return {
    smtp_admin_email: values.SUPABASE_SMTP_ADMIN_EMAIL,
    smtp_host: values.SUPABASE_SMTP_HOST,
    smtp_port: port,
    smtp_user: values.SUPABASE_SMTP_USER,
    smtp_pass: values.SUPABASE_SMTP_PASS,
    smtp_sender_name: String(process.env.SUPABASE_SMTP_SENDER_NAME || 'AccessRevamp').trim(),
  };
}

async function authRequest(path, accessToken, options = {}) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Supabase Management API returned ${response.status}: ${data.message || data.error || 'request failed'}`);
  }
  return data;
}

const accessToken = required('SUPABASE_ACCESS_TOKEN');
const ref = projectRef();
const siteUrl = secureSiteUrl();
const [confirmation, magicLink, recovery] = await Promise.all([
  readFile(new URL('supabase/templates/accessrevamp-confirmation.html', root), 'utf8'),
  readFile(new URL('supabase/templates/accessrevamp-magic-link.html', root), 'utf8'),
  readFile(new URL('supabase/templates/accessrevamp-recovery.html', root), 'utf8'),
]);

for (const [name, template] of [['confirmation', confirmation], ['magic link', magicLink]]) {
  if (!template.includes('{{ .Token }}')) throw new Error(`The ${name} template must contain {{ .Token }}.`);
  if (template.includes('{{ .ConfirmationURL }}')) throw new Error(`The ${name} template must not contain a verification link.`);
}

const payload = {
  external_email_enabled: true,
  mailer_secure_email_change_enabled: true,
  mailer_autoconfirm: false,
  mailer_otp_exp: EMAIL_OTP_SECONDS,
  site_url: siteUrl,
  uri_allow_list: redirectAllowList(siteUrl),
  mailer_subjects_confirmation: 'Your AccessRevamp confirmation code',
  mailer_templates_confirmation_content: confirmation,
  mailer_subjects_magic_link: 'Your AccessRevamp secure sign-in code',
  mailer_templates_magic_link_content: magicLink,
  mailer_subjects_recovery: 'Reset your AccessRevamp password',
  mailer_templates_recovery_content: recovery,
  ...smtpPayload(),
};

if (process.argv.includes('--verify')) {
  const current = await authRequest(`/v1/projects/${ref}/config/auth`, accessToken);
  const currentConfirmation = String(current.mailer_templates_confirmation_content || '');
  const currentMagicLink = String(current.mailer_templates_magic_link_content || '');
  const checks = {
    emailProviderEnabled: current.external_email_enabled === true,
    emailConfirmationRequired: current.mailer_autoconfirm === false,
    emailOtpExpiresInTenMinutes: Number(current.mailer_otp_exp) === EMAIL_OTP_SECONDS,
    siteUrlMatches: String(current.site_url || '').replace(/\/$/, '') === siteUrl,
    productionSiteIsNotLocalhost: !/localhost|127\.0\.0\.1/i.test(String(current.site_url || '')),
    confirmationTemplateBranded: currentConfirmation.includes('AccessRevamp'),
    confirmationTemplateUsesCode: currentConfirmation.includes('{{ .Token }}'),
    confirmationTemplateHasNoVerifyLink: !currentConfirmation.includes('{{ .ConfirmationURL }}'),
    signInTemplateBranded: currentMagicLink.includes('AccessRevamp'),
    signInTemplateUsesCode: currentMagicLink.includes('{{ .Token }}'),
    signInTemplateHasNoVerifyLink: !currentMagicLink.includes('{{ .ConfirmationURL }}'),
    customSmtpConfigured: Boolean(current.smtp_host && current.smtp_admin_email),
  };
  console.log(JSON.stringify(checks, null, 2));
  if (!Object.entries(checks).filter(([name]) => name !== 'customSmtpConfigured').every(([, value]) => value)) {
    process.exitCode = 1;
  }
} else {
  await authRequest(`/v1/projects/${ref}/config/auth`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  console.log(JSON.stringify({
    updated: true,
    projectRef: ref,
    siteUrl,
    emailVerificationMode: 'six-digit-code',
    emailOtpExpiresInSeconds: EMAIL_OTP_SECONDS,
    customSmtpConfigured: Boolean(payload.smtp_host),
    credentialsPrinted: false,
  }, null, 2));
}
