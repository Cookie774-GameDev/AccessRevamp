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
  if (!/^[^@\s]+@[^@\s]+$/.test(address)) throw new Error('WORKER6_GMAIL_ADDRESS must be an email address.');
  if (password.length < 16) throw new Error('WORKER6_GMAIL_APP_PASSWORD must be a Google app password.');
  const port = Number(env.WORKER6_GMAIL_IMAP_PORT || 993);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('WORKER6_GMAIL_IMAP_PORT is invalid.');
  const safe = Object.freeze({ address, host: env.WORKER6_GMAIL_IMAP_HOST || 'imap.gmail.com', port });
  return Object.freeze({
    supabaseUrl,
    serviceRoleKey,
    supportAddress: address,
    composerCommand: String(env.WORKER6_REPLY_COMPOSER_COMMAND || '').trim(),
    imap: Object.freeze({ ...safe, password, secure: true }),
    safe,
  });
}
