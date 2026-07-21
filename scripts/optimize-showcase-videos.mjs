import { access, rename, rm, stat, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const distDirectory = join(process.cwd(), 'dist');
const showcaseDirectory = join(distDirectory, 'media', 'showcases');
const manifestPath = join(distDirectory, 'showcase-optimization.json');
const showcaseFiles = [
  'verdant-normal.mp4',
  'verdant-cinematic.mp4',
  'northframe-normal.mp4',
  'northframe-cinematic.mp4',
  'olympus-normal.mp4',
  'olympus-cinematic.mp4',
];
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const requireOptimization = process.env.REQUIRE_FFMPEG_OPTIMIZATION === 'true';
const configuredMaximum = Number(process.env.MAX_SHOWCASE_VIDEO_BYTES || 0);
const maximumOutputBytes = Number.isSafeInteger(configuredMaximum) && configuredMaximum > 0
  ? configuredMaximum
  : 0;
const manifest = {
  status: 'pending',
  generatedAt: new Date().toISOString(),
  optimizationRequired: requireOptimization,
  maximumOutputBytes: maximumOutputBytes || null,
  encoder: {
    codec: 'h264',
    maximumWidth: 1024,
    framesPerSecond: 24,
    keyframeInterval: 2,
    bFrames: 0,
    fastStart: true,
  },
  files: [],
};

const writeManifest = async () => {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
};

const inputs = new Map();
for (const filename of showcaseFiles) {
  const input = join(showcaseDirectory, filename);
  try {
    await access(input, fsConstants.R_OK);
    const details = await stat(input);
    inputs.set(filename, { input, beforeBytes: details.size });
    manifest.files.push({ filename, status: 'verified', sourceBytes: details.size });
  } catch {
    manifest.files.push({ filename, status: 'missing' });
  }
}

const missing = manifest.files.filter((file) => file.status === 'missing');
if (missing.length) {
  manifest.status = 'missing-media';
  await writeManifest();
  throw new Error(`Missing required showcase video${missing.length === 1 ? '' : 's'}: ${missing.map((file) => file.filename).join(', ')}`);
}

const available = spawnSync(ffmpeg, ['-version'], { stdio: 'ignore' });
if (available.status !== 0) {
  manifest.status = 'ffmpeg-unavailable';
  manifest.files = manifest.files.map((file) => ({ ...file, status: 'preserved' }));
  await writeManifest();
  const message = 'ffmpeg is unavailable; using the checked-in showcase videos without re-encoding.';
  if (requireOptimization) throw new Error(message);
  console.warn(`${message} Deploy builds remain valid because every required video was verified first.`);
  process.exit(0);
}

for (const filename of showcaseFiles) {
  const { input, beforeBytes } = inputs.get(filename);
  const output = join(showcaseDirectory, `.${filename}.scrub-ready.mp4`);
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

  const entry = manifest.files.find((file) => file.filename === filename);
  if (result.status !== 0) {
    await rm(output, { force: true });
    Object.assign(entry, { status: 'failed', exitCode: result.status });
    manifest.status = 'encoding-failed';
    await writeManifest();
    throw new Error(`Failed to optimize ${filename} for scroll scrubbing.`);
  }

  const outputDetails = await stat(output);
  if (maximumOutputBytes && outputDetails.size > maximumOutputBytes) {
    await rm(output, { force: true });
    Object.assign(entry, {
      status: 'oversized',
      originalBytes: beforeBytes,
      optimizedBytes: outputDetails.size,
      maximumOutputBytes,
    });
    delete entry.sourceBytes;
    manifest.status = 'oversized-media';
    await writeManifest();
    throw new Error(`Optimized showcase video exceeds the deploy limit: ${filename}`);
  }

  await rm(input, { force: true });
  await rename(output, input);
  Object.assign(entry, {
    status: 'optimized',
    originalBytes: beforeBytes,
    optimizedBytes: outputDetails.size,
  });
  delete entry.sourceBytes;
  const beforeMb = (beforeBytes / 1024 / 1024).toFixed(1);
  const afterMb = (outputDetails.size / 1024 / 1024).toFixed(1);
  console.log(`Optimized ${filename}: ${beforeMb} MB -> ${afterMb} MB`);
}

manifest.status = manifest.files.length === showcaseFiles.length && manifest.files.every((file) => file.status === 'optimized')
  ? 'optimized'
  : 'partial';
await writeManifest();

if (requireOptimization && manifest.status !== 'optimized') {
  throw new Error(`Showcase optimization finished with status: ${manifest.status}`);
}
