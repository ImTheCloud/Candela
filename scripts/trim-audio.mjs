#!/usr/bin/env node
// Cuts the silence Edge puts around every recording (about 0.25 s before the voice, 0.85 s after it):
// the voice starts the moment the button is pressed, and the next verse follows without a long gap.
// Lossless (whole MP3 frames are kept, nothing is re-encoded) and safe to run again: a file already
// trimmed is left as it is. Needs ffmpeg (brew install ffmpeg). Called by generate-audio.mjs.
//   node scripts/trim-audio.mjs            every file in public/audio
//   node scripts/trim-audio.mjs a.mp3 ...  only these
import { execFile } from 'node:child_process';
import { readdirSync, renameSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio');
/** silence kept before the voice, and after it (a natural breath before the next verse) */
const KEEP_BEFORE = 0.04;
const KEEP_AFTER = 0.3;
/** less than this to cut: the file is left as it is */
const MIN_CUT = 0.08;

/** Where the voice starts and ends in a file, and its length, in seconds. */
async function measure(file) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-nostdin', '-i', file, '-af', 'silencedetect=noise=-40dB:d=0.03', '-f', 'null', '-'], { maxBuffer: 1 << 24 });
  const t = [...stderr.matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
  const duration = t ? Number(t[1]) * 3600 + Number(t[2]) * 60 + Number(t[3]) : 0;
  const starts = [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  // silence from the very start: the voice begins where it ends
  const voiceStart = starts.length && starts[0] < 0.01 ? ends[0] ?? 0 : 0;
  // silence running to the very end: the voice stops where it starts
  const last = starts[starts.length - 1];
  const lastEnd = ends[starts.length - 1];
  const voiceEnd = last !== undefined && last > voiceStart && (lastEnd === undefined || lastEnd >= duration - 0.05) ? last : duration;
  return { voiceStart, voiceEnd, duration };
}

export async function trimFile(file) {
  const { voiceStart, voiceEnd, duration } = await measure(file);
  if (!duration) return false;
  const from = Math.max(0, voiceStart - KEEP_BEFORE);
  const to = Math.min(duration, voiceEnd + KEEP_AFTER);
  if (from < MIN_CUT && duration - to < MIN_CUT) return false;
  const tmp = `${file}.trim.mp3`;
  try {
    await run('ffmpeg', ['-hide_banner', '-nostdin', '-loglevel', 'error', '-y', '-ss', from.toFixed(3), '-to', to.toFixed(3), '-i', file, '-c', 'copy', '-map_metadata', '-1', tmp]);
    renameSync(tmp, file);
    return true;
  } catch (err) {
    try { unlinkSync(tmp); } catch {}
    throw err;
  }
}

async function main() {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(DIR).filter((f) => f.endsWith('.mp3'));
  let trimmed = 0, kept = 0, failed = 0, next = 0;
  const worker = async () => {
    while (next < names.length) {
      const name = names[next++];
      try {
        (await trimFile(join(DIR, name))) ? trimmed++ : kept++;
      } catch (err) {
        failed++;
        console.warn(`\n✗ ${name}: ${err?.message || err}`);
      }
      if ((trimmed + kept + failed) % 100 === 0) process.stdout.write(`\r${trimmed + kept + failed}/${names.length}   `);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`\nDone: ${trimmed} trimmed, ${kept} already tight, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
