import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const STATIC_PACKAGE = 'ffmpeg-static@5.3.0';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const require = createRequire(import.meta.url);

function executableWorks(command) {
  if (!command) return false;
  const result = spawnSync(command, ['-version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0 && /ffmpeg version/i.test(`${result.stdout || ''}\n${result.stderr || ''}`);
}

function installedStaticPath() {
  try {
    const path = require('ffmpeg-static');
    return typeof path === 'string' && path ? path : '';
  } catch {
    return '';
  }
}

function installStaticFfmpeg() {
  console.log(`System FFmpeg is unavailable. Installing pinned build dependency ${STATIC_PACKAGE}…`);
  const result = spawnSync(npmCommand, [
    'install',
    '--no-save',
    '--package-lock=false',
    '--ignore-scripts=false',
    '--no-audit',
    '--no-fund',
    STATIC_PACKAGE,
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      FFMPEG_BINARY_RELEASE: 'b6.1.1',
    },
  });
  if (result.status !== 0) {
    throw new Error(`Unable to install ${STATIC_PACKAGE} for the Netlify media build.`);
  }
}

function resolveFfmpeg() {
  const configured = process.env.FFMPEG_PATH || 'ffmpeg';
  if (executableWorks(configured)) return configured;

  const existingStatic = installedStaticPath();
  if (executableWorks(existingStatic)) return existingStatic;

  installStaticFfmpeg();
  const installed = installedStaticPath();
  if (!executableWorks(installed)) {
    throw new Error('The pinned static FFmpeg package installed but did not provide a working executable.');
  }
  return installed;
}

const ffmpegPath = resolveFfmpeg();
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
