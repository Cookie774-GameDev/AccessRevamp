import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

export async function composeDraft(context, command) {
  if (!command) return { ok: false, reason: 'No approved draft composer is configured.' };
  const directory = await mkdtemp(join(tmpdir(), 'accessrevamp-worker6-'));
  const input = join(directory, 'context.json');
  await writeFile(input, JSON.stringify(context), { encoding: 'utf8', mode: 0o600 });
  const [executable, ...args] = command.match(/(?:[^\s"]+|"[^"]*")+/g).map((part) => part.replace(/^"|"$/g, ''));
  const result = await run(executable, [...args, input], { timeout: 60_000, windowsHide: true, maxBuffer: 64 * 1024 });
  const body = String(result.stdout || '').trim();
  if (body.length < 10 || body.length > 20_000) return { ok: false, reason: 'Composer output failed validation.' };
  if (/\b(password|secret key|service role|api key)\b/i.test(body)) return { ok: false, reason: 'Composer output contains restricted content.' };
  return { ok: true, body };
}
