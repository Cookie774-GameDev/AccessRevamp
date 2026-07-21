import { createWriteStream } from 'node:fs';
import { access, chmod, mkdir, rename, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createGunzip } from 'node:zlib';
import { join } from 'node:path';
import { platform, arch } from 'node:os';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const FFMPEG_RELEASE = 'b6.1.1';
const DOWNLOAD_TIMEOUT_MS = 180_000;
const MAX_COMPRESSED_BYTES = 150 * 1024 * 1024;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const supportedPlatforms = new Set(['linux', 'darwin', 'win32']);
const supportedArchitectures = new Set(['x64', 'arm64', 'ia32', 'arm']);

function executableWorks(command) {
  if (!command) return false;
  const result = spawnSync(command, ['-version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  return result.status === 0 && /ffmpeg version/i.test(output);
}

function releaseAsset() {
  const currentPlatform = platform();
  const currentArch = arch();
  if (!supportedPlatforms.has(currentPlatform) || !supportedArchitectures.has(currentArch)) {
    throw new Error(`No pinned FFmpeg build is configured for ${currentPlatform}-${currentArch}.`);
  }
  return `ffmpeg-${currentPlatform}-${currentArch}.gz`;
}

async function downloadPinnedFfmpeg(destination) {
  const asset = releaseAsset();
  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/${FFMPEG_RELEASE}/${asset}`;
  const temporary = `${destination}.${process.pid}.download`;
  await rm(temporary, { force: true });
  console.log(`Downloading pinned FFmpeg ${FFMPEG_RELEASE} for this Netlify build…`);

  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    headers: { 'user-agent': 'AccessRevamp-Netlify-Build/1.0' },
  });
  if (!response.ok || !response.body) {
    throw new Error(`Pinned FFmpeg download failed with HTTP ${response.status}.`);
  }
  const compressedLength = Number(response.headers.get('content-length') || 0);
  if (compressedLength > MAX_COMPRESSED_BYTES) {
    throw new Error('Pinned FFmpeg download exceeded the allowed compressed size.');
  }

  try {
    await pipeline(
      Readable.fromWeb(response.body),
      createGunzip(),
      createWriteStream(temporary, { mode: 0o755 }),
    );
    await chmod(temporary, 0o755);
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function resolveFfmpeg() {
  const configured = process.env.FFMPEG_PATH || 'ffmpeg';
  if (executableWorks(configured)) return configured;

  const cacheDirectory = process.env.NETLIFY_CACHE_DIR
    || join(process.cwd(), '.netlify', 'cache');
  const executableName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const cached = join(cacheDirectory, `${FFMPEG_RELEASE}-${platform()}-${arch()}-${executableName}`);
  await mkdir(cacheDirectory, { recursive: true });

  try { await access(cached); } catch { /* Download below. */ }
  if (executableWorks(cached)) return cached;
  await rm(cached, { force: true });
  await downloadPinnedFfmpeg(cached);
  if (!executableWorks(cached)) {
    await rm(cached, { force: true });
    throw new Error('The pinned FFmpeg download did not provide a working executable.');
  }
  return cached;
}

const ffmpegPath = await resolveFfmpeg();
console.log(`Using FFmpeg for Netlify build: ${ffmpegPath}`);

const build = spawnSync(npmCommand, ['run', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    FFMPEG_PATH: ffmpegPath,
    REQUIRE_FFMPEG_OPTIMIZATION: 'true',
    MAX_SHOWCASE_VIDEO_BYTES: '9500000',
  },
});

if (build.error) throw build.error;
process.exitCode = build.status ?? 1;
