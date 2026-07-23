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

function managementAccessToken() {
  const value = required('SUPABASE_ACCESS_TOKEN');
  const jwtLike = value.split('.').length === 3;
  const projectKeyLike = /^sb_(?:publishable|secret)_/i.test(value);
  if (jwtLike || projectKeyLike) {
    throw new Error(
      'SUPABASE_ACCESS_TOKEN contains a Supabase project API key. '
      + 'This workflow requires a Supabase account personal access token from Dashboard → Account → Access Tokens; '
      + 'do not use the publishable, anon, secret, or service-role key.',
    );
  }
  if (value.length < 20) {
    throw new Error('SUPABASE_ACCESS_TOKEN is too short to be a valid Supabase account personal access token.');
  }
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

function apiErrorMessage(data) {
  const candidate = data?.message || data?.error_description || data?.error || data?.msg;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 500);
  return 'request failed';
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
    const detail = apiErrorMessage(data);
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Supabase Management API authentication failed (HTTP ${response.status}: ${detail}). `
        + 'SUPABASE_ACCESS_TOKEN must be an account personal access token whose owner can access this project; '
        + 'project publishable, anon, secret, and service-role keys cannot manage hosted Auth settings.',
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Supabase Management API could not access project ${projectRef()} (HTTP 404: ${detail}). `
        + 'Confirm that the personal access token belongs to an account with access to this project.',
      );
    }
    throw new Error(`Supabase Management API returned HTTP ${response.status}: ${detail}`);
  }
  return data;
}

const accessToken = managementAccessToken();
const ref = projectRef();
const siteUrl = secureSiteUrl();
const smtp = smtpPayload();
const customSmtpRequested = Boolean(smtp.smtp_host);
const [confirmation, magicLink, recovery] = await Promise.all([
  readFile(new URL('supabase/templates/accessrevamp-confirmation.html', root), 'utf8'),
  readFile(new URL('supabase/templates/accessrevamp-magic-link.html', root), 'utf8'),
  readFile(new URL('supabase/templates/accessrevamp-recovery.html', root), 'utf8'),
]);

for (const [name, template] of [['confirmation', confirmation], ['magic link', magicLink]]) {
  if (!template.includes('{{ .Token }}')) throw new Error(`The ${name} template must contain {{ .Token }}.`);
  if (template.includes('{{ .ConfirmationURL }}')) throw new Error(`The ${name} template must not contain a verification link.`);
}

const basePayload = {
  external_email_enabled: true,
  mailer_secure_email_change_enabled: true,
  mailer_autoconfirm: false,
  mailer_otp_exp: EMAIL_OTP_SECONDS,
  site_url: siteUrl,
  uri_allow_list: redirectAllowList(siteUrl),
};

const templatePayload = {
  mailer_subjects_confirmation: 'Your AccessRevamp confirmation code',
  mailer_templates_confirmation_content: confirmation,
  mailer_subjects_magic_link: 'Your AccessRevamp secure sign-in code',
  mailer_templates_magic_link_content: magicLink,
  mailer_subjects_recovery: 'Reset your AccessRevamp password',
  mailer_templates_recovery_content: recovery,
};

if (process.argv.includes('--verify')) {
  const current = await authRequest(`/v1/projects/${ref}/config/auth`, accessToken);
  const currentConfirmation = String(current.mailer_templates_confirmation_content || '');
  const currentMagicLink = String(current.mailer_templates_magic_link_content || '');
  const customSmtpConfigured = Boolean(current.smtp_host && current.smtp_admin_email);
  const baseChecks = {
    emailProviderEnabled: current.external_email_enabled === true,
    emailConfirmationRequired: current.mailer_autoconfirm === false,
    emailOtpExpiresInTenMinutes: Number(current.mailer_otp_exp) === EMAIL_OTP_SECONDS,
    siteUrlMatches: String(current.site_url || '').replace(/\/$/, '') === siteUrl,
    productionSiteIsNotLocalhost: !/localhost|127\.0\.0\.1/i.test(String(current.site_url || '')),
    productionRedirectsAllowed: productionOrigins(siteUrl).every((origin) => String(current.uri_allow_list || '').includes(`${origin}/login`)),
  };
  const templateChecks = {
    confirmationTemplateBranded: currentConfirmation.includes('AccessRevamp'),
    confirmationTemplateUsesCode: currentConfirmation.includes('{{ .Token }}'),
    confirmationTemplateHasNoVerifyLink: !currentConfirmation.includes('{{ .ConfirmationURL }}'),
    signInTemplateBranded: currentMagicLink.includes('AccessRevamp'),
    signInTemplateUsesCode: currentMagicLink.includes('{{ .Token }}'),
    signInTemplateHasNoVerifyLink: !currentMagicLink.includes('{{ .ConfirmationURL }}'),
  };
  const checks = {
    ...baseChecks,
    customSmtpConfigured,
    officialCodeTemplatesActive: customSmtpConfigured && Object.values(templateChecks).every(Boolean),
    ...(customSmtpRequested ? templateChecks : {}),
  };
  console.log(JSON.stringify({
    ...checks,
    emailDeliveryMode: checks.officialCodeTemplatesActive ? 'official-six-digit-code' : 'production-link-fallback',
    customSmtpRequiredForCodeTemplates: !checks.officialCodeTemplatesActive,
  }, null, 2));
  const baseValid = Object.values(baseChecks).every(Boolean);
  const requestedTemplatesValid = !customSmtpRequested
    || (customSmtpConfigured && Object.values(templateChecks).every(Boolean));
  if (!baseValid || !requestedTemplatesValid) process.exitCode = 1;
} else {
  // Apply the production URL and redirect allow list independently. Supabase Free
  // projects using the built-in mailer reject template modifications, but they
  // still allow these safety-critical Auth settings.
  await authRequest(`/v1/projects/${ref}/config/auth`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(basePayload),
  });

  let officialCodeTemplatesActive = false;
  if (customSmtpRequested) {
    // Configure the custom transport before modifying templates so Free projects
    // no longer use Supabase's restricted built-in mailer.
    await authRequest(`/v1/projects/${ref}/config/auth`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(smtp),
    });
    await authRequest(`/v1/projects/${ref}/config/auth`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(templatePayload),
    });
    officialCodeTemplatesActive = true;
  }

  console.log(JSON.stringify({
    updated: true,
    projectRef: ref,
    siteUrl,
    productionRedirectsConfigured: true,
    emailOtpExpiresInSeconds: EMAIL_OTP_SECONDS,
    customSmtpConfigured: customSmtpRequested,
    officialCodeTemplatesActive,
    emailDeliveryMode: officialCodeTemplatesActive ? 'official-six-digit-code' : 'production-link-fallback',
    customSmtpRequiredForCodeTemplates: !officialCodeTemplatesActive,
    credentialsPrinted: false,
  }, null, 2));
}
