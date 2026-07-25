const required = (env, name) => {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

export function loadWorker6Config(env = process.env) {
  const supabaseUrl = required(env, 'SUPABASE_URL');
  const serviceRoleKey = required(env, 'SUPABASE_SERVICE_ROLE_KEY');
  const address = required(env, 'WORKER6_GMAIL_ADDRESS').toLowerCase();
  const password = required(env, 'WORKER6_GMAIL_APP_PASSWORD').replace(/\s+/g, '');
  const supportUsername = required(env, 'WORKER6_SUPPORT_SMTP_USERNAME').toLowerCase();
  const supportPassword = required(env, 'WORKER6_SUPPORT_SMTP_PASSWORD').replace(/\s+/g, '');
  const supportFromAddress = required(env, 'WORKER6_SUPPORT_FROM_ADDRESS').toLowerCase();
  if (!/^[^@\s]+@[^@\s]+$/.test(address)) throw new Error('WORKER6_GMAIL_ADDRESS must be an email address.');
  if (password.length < 16) throw new Error('WORKER6_GMAIL_APP_PASSWORD must be a Google app password.');
  if (!/^[^@\s]+@[^@\s]+$/.test(supportUsername) || !/^[^@\s]+@[^@\s]+$/.test(supportFromAddress)) {
    throw new Error('Worker 6 support sender identity is invalid.');
  }
  if (supportUsername !== supportFromAddress) {
    throw new Error('Worker 6 support sender identity must match the authenticated Workspace account.');
  }
  if (supportPassword.length < 16) throw new Error('WORKER6_SUPPORT_SMTP_PASSWORD must be a Google app password.');
  if (address === supportFromAddress) throw new Error('The merged reader and visible support sender must remain separate.');
  const port = Number(env.WORKER6_GMAIL_IMAP_PORT || 993);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('WORKER6_GMAIL_IMAP_PORT is invalid.');
  const supportPort = Number(env.WORKER6_SUPPORT_SMTP_PORT || 587);
  if (!Number.isInteger(supportPort) || supportPort < 1 || supportPort > 65535) {
    throw new Error('WORKER6_SUPPORT_SMTP_PORT is invalid.');
  }
  const support = Object.freeze({
    username: supportUsername,
    password: supportPassword,
    fromAddress: supportFromAddress,
    host: String(env.WORKER6_SUPPORT_SMTP_HOST || 'smtp.gmail.com').trim().toLowerCase(),
    port: supportPort,
  });
  const safe = Object.freeze({
    readerAddress: address,
    imapHost: env.WORKER6_GMAIL_IMAP_HOST || 'imap.gmail.com',
    imapPort: port,
    supportFromAddress,
    supportSmtpHost: support.host,
    supportSmtpPort: support.port,
    autoSendEnabled: String(env.WORKER6_AUTO_SEND_ENABLED || '').toLowerCase() === 'true',
  });
  return Object.freeze({
    supabaseUrl,
    serviceRoleKey,
    readerAddress: address,
    supportAddress: supportFromAddress,
    support,
    icemailApiKey: String(env.ICEMAIL_API_KEY || '').trim(),
    autoSendEnabled: safe.autoSendEnabled,
    composerCommand: String(env.WORKER6_REPLY_COMPOSER_COMMAND || '').trim(),
    imap: Object.freeze({
      address,
      host: safe.imapHost,
      port,
      password,
      secure: true,
    }),
    safe,
  });
}
