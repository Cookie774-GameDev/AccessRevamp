import {
  assertGraphConfig,
  assertIcemailConfig,
  assertSupabaseConfig,
  loadMailboxMcpConfig,
} from './config.mjs';
import { createGraphCredential } from './graph-client.mjs';
import { createIcemailClient } from './icemail-client.mjs';
import { createMailboxRepository } from './repository.mjs';

const config = loadMailboxMcpConfig();
const checks = [];

const runCheck = async (name, operation) => {
  try {
    const details = await operation();
    checks.push({ name, passed: true, details });
  } catch (error) {
    checks.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : 'Check failed.',
    });
  }
};

await runCheck('supabase-control-plane', async () => {
  assertSupabaseConfig(config);
  const repository = createMailboxRepository({ config });
  const capacity = await repository.getCapacity();
  return { capacity };
});
await runCheck('microsoft-graph-application', async () => {
  assertGraphConfig(config);
  const credential = createGraphCredential(config);
  const token = await credential.getToken('https://graph.microsoft.com/.default');
  if (!token?.token) throw new Error('No application token was returned.');
  return { authenticated: true, expiresOnTimestamp: token.expiresOnTimestamp || null };
});

if (config.icemailInventorySyncEnabled) {
  await runCheck('icemail-reduced-inventory', async () => {
    assertIcemailConfig(config);
    const client = createIcemailClient({
      apiBaseUrl: config.icemailApiBaseUrl,
      apiKey: config.icemailApiKey,
    });
    const domains = await client.listDomains();
    return { domainCount: domains.length };
  });
}

const report = {
  passed: checks.every((check) => check.passed),
  checkedAtUtc: new Date().toISOString(),
  featureSwitches: {
    draftWritesEnabled: config.draftWritesEnabled,
    messageStateWritesEnabled: config.messageStateWritesEnabled,
    icemailInventorySyncEnabled: config.icemailInventorySyncEnabled,
  },
  checks,
};
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
