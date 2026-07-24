import { readFile } from 'node:fs/promises';

const API_ORIGIN = 'https://api.supabase.com';
const PRODUCTION_SITE_URL = 'https://accessrevamp.com';
const EMAIL_OTP_SECONDS = 10 * 60;
const OFFICIAL_SENDER_NAME = 'Access Revamp Authorization';
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
      'SUPABASE_ACCESS_TOKEN contains a project API key. '
      + 'This workflow requires an account personal access token from Dashboard → Account → Access Tokens; '
      + 'do not use a publishable, anon, secret, or service-role key.',
    );
  }
  if (value.length < 20) {
    throw new Error('SUPABASE_ACCESS_TOKEN is too short to be a valid account personal access token.');
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
  if (!match) throw new Error('SUPABASE_URL does not contain a hosted project reference.');
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
    `${origin}/forgot-password`,
    `${origin}/recover-account`,
    `${origin}/recover-account?recovery=link`,
    `${origin}/account/projects`,
    `${origin}/dashboard`,
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
  const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();
  const resendFromEmail = String(process.env.ACCESSREVAMP_FROM_EMAIL || '').trim();
  const resendSupplied = [resendApiKey, resendFromEmail].filter(Boolean).length;
  const gmailUser = String(process.env.ACCESSREVAMP_GMAIL_USER || '').trim();
  const gmailAppPassword = String(process.env.ACCESSREVAMP_GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  const gmailSupplied = [gmailUser, gmailAppPassword].filter(Boolean).length;
  const configuredModes = Number(supplied.length > 0) + Number(resendSupplied > 0) + Number(gmailSupplied > 0);

  if (configuredModes > 1) {
    throw new Error('Choose one mail transport: full SUPABASE_SMTP_*, Resend, or Access Revamp Gmail.');
  }
  if (supplied.length && supplied.length !== names.length) {
    throw new Error('All SUPABASE_SMTP_* credentials are required when enabling custom SMTP.');
  }
  if (resendSupplied && resendSupplied !== 2) {
    throw new Error('Both RESEND_API_KEY and ACCESSREVAMP_FROM_EMAIL are required when enabling Resend SMTP.');
  }
  if (gmailSupplied && gmailSupplied !== 2) {
    throw new Error('Both ACCESSREVAMP_GMAIL_USER and ACCESSREVAMP_GMAIL_APP_PASSWORD are required when enabling Gmail SMTP.');
  }

  const senderName = String(process.env.SUPABASE_SMTP_SENDER_NAME || OFFICIAL_SENDER_NAME).trim();

  if (supplied.length === names.length) {
    const port = Number(values.SUPABASE_SMTP_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SUPABASE_SMTP_PORT is invalid.');
    return {
      smtp_admin_email: values.SUPABASE_SMTP_ADMIN_EMAIL,
      smtp_host: values.SUPABASE_SMTP_HOST,
      smtp_port: port,
      smtp_user: values.SUPABASE_SMTP_USER,
      smtp_pass: values.SUPABASE_SMTP_PASS,
      smtp_sender_name: senderName,
    };
  }

  if (resendSupplied === 2) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendFromEmail)) {
      throw new Error('ACCESSREVAMP_FROM_EMAIL must be a verified sender email address.');
    }
    return {
      smtp_admin_email: resendFromEmail,
      smtp_host: 'smtp.resend.com',
      smtp_port: 465,
      smtp_user: 'resend',
      smtp_pass: resendApiKey,
      smtp_sender_name: senderName,
    };
  }

  if (gmailSupplied === 2) {
    if (!/^[^\s@]+@gmail\.com$/i.test(gmailUser)) {
      throw new Error('ACCESSREVAMP_GMAIL_USER must be the Access Revamp Gmail address.');
    }
    if (gmailAppPassword.length < 16) {
      throw new Error('ACCESSREVAMP_GMAIL_APP_PASSWORD must be a Google app password, not the normal mailbox password.');
    }
    return {
      smtp_admin_email: gmailUser,
      smtp_host: 'smtp.gmail.com',
      smtp_port: 465,
      smtp_user: gmailUser,
      smtp_pass: gmailAppPassword,
      smtp_sender_name: senderName,
    };
  }

  return {};
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
        `Auth Management API authentication failed (HTTP ${response.status}: ${detail}). `
        + 'SUPABASE_ACCESS_TOKEN must be an account personal access token whose owner can access this project; '
        + 'project publishable, anon, secret, and service-role keys cannot manage hosted Auth settings.',
      );
    }
    if (response.status === 404) {
      throw new Error(
        `Auth Management API could not access project ${projectRef()} (HTTP 404: ${detail}). `
        + 'Confirm that the personal access token belongs to an account with access to this project.',
      );
    }
    throw new Error(`Auth Management API returned HTTP ${response.status}: ${detail}`);
  }
  return data;
}

function restrictedDefaultMailer(error) {
  return /custom smtp|required|free tier|default email provider|template modification/i.test(String(error?.message || error));
}

const accessToken = managementAccessToken();
const ref = projectRef();
const siteUrl = secureSiteUrl();
const smtp = smtpPayload();
const customSmtpRequested = Boolean(smtp.smtp_host);
const smtpMode = !customSmtpRequested
  ? 'none'
  : smtp.smtp_host === 'smtp.resend.com'
    ? 'resend'
    : smtp.smtp_host === 'smtp.gmail.com'
      ? 'gmail'
      : 'custom';
const [confirmation, magicLink, recovery] = await Promise.all([
  readFile(new URL('supabase/templates/accessrevamp-confirmation.html', root), 'utf8'),
  readFile(new URL('supabase/templates/accessrevamp-magic-link.html', root), 'utf8'),
  readFile(new URL('supabase/templates/accessrevamp-recovery.html', root), 'utf8'),
]);

for (const [name, template] of [
  ['confirmation', confirmation],
  ['sign-in', magicLink],
  ['recovery', recovery],
]) {
  if (!template.includes('{{ .Token }}')) throw new Error(`The ${name} template must contain {{ .Token }}.`);
  if (template.includes('{{ .ConfirmationURL }}')) throw new Error(`The ${name} template must not contain a verification link.`);
  if (!template.includes('Access Revamp Authorization')) throw new Error(`The ${name} template must show the official authorization identity.`);
  if (!template.includes('accessrevamp-email-logo.svg')) throw new Error(`The ${name} template must use the official AR email logo.`);
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
  mailer_subjects_confirmation: 'Your Access Revamp confirmation code',
  mailer_templates_confirmation_content: confirmation,
  mailer_subjects_magic_link: 'Your Access Revamp secure sign-in code',
  mailer_templates_magic_link_content: magicLink,
  mailer_subjects_recovery: 'Your Access Revamp password recovery code',
  mailer_templates_recovery_content: recovery,
};

if (process.argv.includes('--verify')) {
  const current = await authRequest(`/v1/projects/${ref}/config/auth`, accessToken);
  const currentConfirmation = String(current.mailer_templates_confirmation_content || '');
  const currentMagicLink = String(current.mailer_templates_magic_link_content || '');
  const currentRecovery = String(current.mailer_templates_recovery_content || '');
  const currentAllowList = String(current.uri_allow_list || '');
  const customSmtpConfigured = Boolean(current.smtp_host && current.smtp_admin_email);
  const senderNameMatches = String(current.smtp_sender_name || '') === OFFICIAL_SENDER_NAME;
  const baseChecks = {
    emailProviderEnabled: current.external_email_enabled === true,
    emailConfirmationRequired: current.mailer_autoconfirm === false,
    emailOtpExpiresInTenMinutes: Number(current.mailer_otp_exp) === EMAIL_OTP_SECONDS,
    siteUrlMatches: String(current.site_url || '').replace(/\/$/, '') === siteUrl,
    productionSiteIsNotLocalhost: !/localhost|127\.0\.0\.1/i.test(String(current.site_url || '')),
    productionRedirectsAllowed: productionOrigins(siteUrl).every((origin) => (
      currentAllowList.includes(`${origin}/login`)
      && currentAllowList.includes(`${origin}/recover-account`)
    )),
  };
  const templateChecks = {
    confirmationTemplateBranded: currentConfirmation.includes('Access Revamp Authorization'),
    confirmationTemplateUsesCode: currentConfirmation.includes('{{ .Token }}'),
    confirmationTemplateHasNoVerifyLink: !currentConfirmation.includes('{{ .ConfirmationURL }}'),
    signInTemplateBranded: currentMagicLink.includes('Access Revamp Authorization'),
    signInTemplateUsesCode: currentMagicLink.includes('{{ .Token }}'),
    signInTemplateHasNoVerifyLink: !currentMagicLink.includes('{{ .ConfirmationURL }}'),
    recoveryTemplateBranded: currentRecovery.includes('Access Revamp Authorization'),
    recoveryTemplateUsesCode: currentRecovery.includes('{{ .Token }}'),
    recoveryTemplateHasNoVerifyLink: !currentRecovery.includes('{{ .ConfirmationURL }}'),
  };
  const codeTemplatesActive = Object.values(templateChecks).every(Boolean);
  const officialCodeTemplatesActive = customSmtpConfigured && senderNameMatches && codeTemplatesActive;
  const checks = {
    ...baseChecks,
    customSmtpConfigured,
    senderNameMatches,
    codeTemplatesActive,
    officialCodeTemplatesActive,
    ...(customSmtpRequested ? templateChecks : {}),
  };
  console.log(JSON.stringify({
    ...checks,
    smtpMode,
    emailDeliveryMode: officialCodeTemplatesActive
      ? 'official-six-digit-code'
      : codeTemplatesActive
        ? 'default-sender-six-digit-code'
        : 'production-link-fallback',
    customSmtpRequiredForOfficialSender: !officialCodeTemplatesActive,
    credentialsPrinted: false,
  }, null, 2));
  const baseValid = Object.values(baseChecks).every(Boolean);
  const requestedTemplatesValid = !customSmtpRequested || officialCodeTemplatesActive;
  if (!baseValid || !requestedTemplatesValid) process.exitCode = 1;
} else {
  await authRequest(`/v1/projects/${ref}/config/auth`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify(basePayload),
  });

  let codeTemplatesActive = false;
  let officialCodeTemplatesActive = false;
  let defaultMailerRestricted = false;

  if (customSmtpRequested) {
    await authRequest(`/v1/projects/${ref}/config/auth`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(smtp),
    });
    await authRequest(`/v1/projects/${ref}/config/auth`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(templatePayload),
    });
    codeTemplatesActive = true;
    officialCodeTemplatesActive = true;
  } else {
    // Some hosted plans allow template customization with the default transport.
    // Try safely; known Free-plan restrictions are reported without breaking the
    // production URL and redirect configuration applied above.
    try {
      await authRequest(`/v1/projects/${ref}/config/auth`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify(templatePayload),
      });
      codeTemplatesActive = true;
    } catch (error) {
      if (!restrictedDefaultMailer(error)) throw error;
      defaultMailerRestricted = true;
    }
  }

  console.log(JSON.stringify({
    updated: true,
    projectRef: ref,
    siteUrl,
    productionRedirectsConfigured: true,
    recoveryRedirectsConfigured: true,
    emailOtpExpiresInSeconds: EMAIL_OTP_SECONDS,
    customSmtpConfigured: customSmtpRequested,
    smtpMode,
    codeTemplatesActive,
    officialCodeTemplatesActive,
    defaultMailerRestricted,
    emailDeliveryMode: officialCodeTemplatesActive
      ? 'official-six-digit-code'
      : codeTemplatesActive
        ? 'default-sender-six-digit-code'
        : 'production-link-fallback',
    customSmtpRequiredForOfficialSender: !officialCodeTemplatesActive,
    credentialsPrinted: false,
  }, null, 2));
}
