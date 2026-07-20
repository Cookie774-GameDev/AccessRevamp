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
const strict = process.env.CI === 'true';
const manifest = {
  status: 'pending',
  generatedAt: new Date().toISOString(),
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

const available = spawnSync(ffmpeg, ['-version'], { stdio: 'ignore' });
if (available.status !== 0) {
  manifest.status = 'ffmpeg-unavailable';
  await writeManifest();
  const message = 'ffmpeg is unavailable; showcase videos cannot be made scrub-ready.';
  if (strict) throw new Error(message);
  console.warn(`${message} Keeping the original local-build videos.`);
  process.exit(0);
}

for (const filename of showcaseFiles) {
  const input = join(showcaseDirectory, filename);
  try {
    await access(input, fsConstants.R_OK | fsConstants.W_OK);
  } catch {
    manifest.files.push({ filename, status: 'missing' });
    if (strict) {
      manifest.status = 'missing-media';
      await writeManifest();
      throw new Error(`Missing required showcase video: ${filename}`);
    }
    console.warn(`Skipping missing showcase video: ${filename}`);
    continue;
  }

  const output = join(showcaseDirectory, `.${filename}.scrub-ready.mp4`);
  const before = await stat(input);
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
    manifest.files.push({ filename, status: 'failed', exitCode: result.status });
    manifest.status = 'encoding-failed';
    await writeManifest();
    throw new Error(`Failed to optimize ${filename} for scroll scrubbing.`);
  }

  await rm(input, { force: true });
  await rename(output, input);
  const after = await stat(input);
  manifest.files.push({
    filename,
    status: 'optimized',
    originalBytes: before.size,
    optimizedBytes: after.size,
  });
  const beforeMb = (before.size / 1024 / 1024).toFixed(1);
  const afterMb = (after.size / 1024 / 1024).toFixed(1);
  console.log(`Optimized ${filename}: ${beforeMb} MB -> ${afterMb} MB`);
}

manifest.status = manifest.files.length === showcaseFiles.length && manifest.files.every((file) => file.status === 'optimized')
  ? 'optimized'
  : 'partial';
await writeManifest();

if (strict && manifest.status !== 'optimized') {
  throw new Error(`Showcase optimization finished with status: ${manifest.status}`);
}
