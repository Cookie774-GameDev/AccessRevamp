import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ENCODER_VERSION = 'accessrevamp-scrub-v5';
const MAXIMUM_BYTES = 9_500_000;
const sourceDirectory = join(process.cwd(), 'public', 'media', 'showcases');
const manifestPath = join(sourceDirectory, 'source-optimization.json');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const showcaseFiles = [
  'verdant-normal.mp4',
  'verdant-cinematic.mp4',
  'northframe-normal.mp4',
  'northframe-cinematic.mp4',
  'olympus-normal.mp4',
  'olympus-cinematic.mp4',
];

async function sha256(path) {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

async function readPreviousManifest() {
  try {
    const parsed = JSON.parse(await readFile(manifestPath, 'utf8'));
    return parsed?.encoderVersion === ENCODER_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

const ffmpegVersion = spawnSync(ffmpeg, ['-version'], { encoding: 'utf8' });
if (ffmpegVersion.status !== 0 || !/ffmpeg version/i.test(`${ffmpegVersion.stdout || ''}\n${ffmpegVersion.stderr || ''}`)) {
  throw new Error('A working FFmpeg executable is required to prepare source showcase media.');
}

const previous = await readPreviousManifest();
const previousByName = new Map((previous?.files || []).map((file) => [file.filename, file]));
const prepared = [];
const nextFiles = [];

try {
  for (const filename of showcaseFiles) {
    const input = join(sourceDirectory, filename);
    await access(input, fsConstants.R_OK);
    const before = await stat(input);
    const currentSha256 = await sha256(input);
    const prior = previousByName.get(filename);

    if (prior?.optimizedSha256 === currentSha256
      && prior?.encoderVersion === ENCODER_VERSION
      && before.size <= MAXIMUM_BYTES) {
      nextFiles.push({
        ...prior,
        filename,
        encoderVersion: ENCODER_VERSION,
        optimizedBytes: before.size,
        optimizedSha256: currentSha256,
        status: 'already-optimized',
      });
      console.log(`Verified ${filename}: ${(before.size / 1024 / 1024).toFixed(1)} MB`);
      continue;
    }

    const output = join(sourceDirectory, `.${filename}.${process.pid}.scrub-ready.mp4`);
    await rm(output, { force: true });
    const result = spawnSync(ffmpeg, [
      '-y',
      '-hide_banner',
      '-loglevel', 'error',
      '-i', input,
      '-map_metadata', '-1',
      '-an',
      '-vf', "scale=w='min(1024,iw)':h=-2:flags=lanczos,fps=24",
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-tune', 'fastdecode',
      '-crf', '24',
      '-pix_fmt', 'yuv420p',
      '-profile:v', 'main',
      '-level', '4.0',
      '-g', '2',
      '-keyint_min', '2',
      '-sc_threshold', '0',
      '-bf', '0',
      '-refs', '1',
      '-movflags', '+faststart',
      output,
    ], { stdio: 'inherit' });

    if (result.status !== 0) {
      await rm(output, { force: true });
      throw new Error(`Failed to optimize ${filename}.`);
    }

    const after = await stat(output);
    if (after.size <= 0 || after.size > MAXIMUM_BYTES) {
      await rm(output, { force: true });
      throw new Error(`Optimized ${filename} is outside the allowed deployment size.`);
    }

    const optimizedSha256 = await sha256(output);
    prepared.push({ input, output });
    nextFiles.push({
      filename,
      encoderVersion: ENCODER_VERSION,
      originalBytes: before.size,
      originalSha256: currentSha256,
      optimizedBytes: after.size,
      optimizedSha256,
      status: 'optimized',
    });
    console.log(`Prepared ${filename}: ${(before.size / 1024 / 1024).toFixed(1)} MB -> ${(after.size / 1024 / 1024).toFixed(1)} MB`);
  }

  for (const item of prepared) {
    await rm(item.input, { force: true });
    await rename(item.output, item.input);
  }

  const manifest = {
    status: 'optimized',
    encoderVersion: ENCODER_VERSION,
    generatedAt: new Date().toISOString(),
    maximumBytes: MAXIMUM_BYTES,
    encoder: {
      codec: 'h264',
      maximumWidth: 1024,
      framesPerSecond: 24,
      keyframeInterval: 2,
      bFrames: 0,
      crf: 24,
      fastStart: true,
    },
    files: nextFiles.map((file) => ({ ...file, status: 'optimized' })),
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Source showcase media is ready: ${showcaseFiles.length} files, each below ${MAXIMUM_BYTES} bytes.`);
} catch (error) {
  await Promise.all(prepared.map(({ output }) => rm(output, { force: true })));
  throw error;
}
