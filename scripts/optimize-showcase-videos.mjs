import { access, rename, rm, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const showcaseDirectory = join(process.cwd(), 'dist', 'media', 'showcases');
const showcaseFiles = [
  'verdant-normal.mp4',
  'verdant-cinematic.mp4',
  'northframe-normal.mp4',
  'northframe-cinematic.mp4',
  'olympus-normal.mp4',
  'olympus-cinematic.mp4',
];
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';

const available = spawnSync(ffmpeg, ['-version'], { stdio: 'ignore' });
if (available.status !== 0) {
  console.warn('ffmpeg is unavailable; keeping the original showcase videos.');
  process.exit(0);
}

for (const filename of showcaseFiles) {
  const input = join(showcaseDirectory, filename);
  try {
    await access(input, fsConstants.R_OK | fsConstants.W_OK);
  } catch {
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
    '-vf', "scale=w='min(1280,iw)':h=-2:flags=lanczos,fps=24",
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-tune', 'fastdecode',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'main',
    '-level', '4.0',
    '-g', '3',
    '-keyint_min', '3',
    '-sc_threshold', '0',
    '-bf', '0',
    '-refs', '1',
    '-movflags', '+faststart',
    output,
  ], { stdio: 'inherit' });

  if (result.status !== 0) {
    await rm(output, { force: true });
    throw new Error(`Failed to optimize ${filename} for scroll scrubbing.`);
  }

  await rm(input, { force: true });
  await rename(output, input);
  const after = await stat(input);
  const beforeMb = (before.size / 1024 / 1024).toFixed(1);
  const afterMb = (after.size / 1024 / 1024).toFixed(1);
  console.log(`Optimized ${filename}: ${beforeMb} MB -> ${afterMb} MB`);
}
