#!/usr/bin/env node
// Records, ahead of time, everything Candela reads out loud: every verse, every "Capitolul N." and every
// quiz question with its options. One MP3 per text in public/audio/, served by Vercel with the site and named by
// audioFileName() from src/lib/speech-text.ts, the same function the site uses to find it.
// Each file is checked like /api/tts checks a synthesis (cutReason): a cut file is made again.
//
// Run again after questions or verses change, then commit public/audio/: only the missing files are made,
// and the recordings of texts that no longer exist (an edited question) are deleted.
//   node scripts/generate-audio.mjs              all books
//   node scripts/generate-audio.mjs --limit 20   a quick try
//   node scripts/generate-audio.mjs --jobs 4     parallel syntheses (default 4)
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { cutReason } from '../api/_tts-core.mjs';
import { trimFile } from './trim-audio.mjs';
import { audioFileName, buildQuestionSpeech, chapterAnnouncement, cleanSpeechText, DEFAULT_VOICE } from '../src/lib/speech-text.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'public', 'audio');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const LIMIT = opt('limit', Infinity);
const JOBS = opt('jobs', 4);
const SYNTH_TIMEOUT_MS = 30000;
const MAX_TRIES = 6;
let warnedTrim = false;

/** Every text the site can say, cleaned exactly as speech.ts cleans it before choosing its file. */
function collectTexts() {
  const texts = new Map(); // file name -> text
  const add = (raw) => {
    const clean = cleanSpeechText(raw);
    if (clean) texts.set(audioFileName(clean, DEFAULT_VOICE), clean);
  };
  const books = readdirSync(join(root, 'content')).filter((b) => existsSync(join(root, 'content', b, 'text-cornilescu.json')));
  for (const book of books) {
    const text = JSON.parse(readFileSync(join(root, 'content', book, 'text-cornilescu.json'), 'utf8'));
    for (const [ch, verses] of Object.entries(text)) {
      add(chapterAnnouncement(Number(ch)));
      for (const v of verses) add(v);
    }
    const qdir = join(root, 'content', book, 'intrebari');
    if (!existsSync(qdir)) continue;
    for (const f of readdirSync(qdir).filter((f) => f.endsWith('.json'))) {
      for (const q of JSON.parse(readFileSync(join(qdir, f), 'utf8')).questions) add(buildQuestionSpeech(q));
    }
  }
  return texts;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function newTts() {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(DEFAULT_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
  return tts;
}

/** One synthesis, whole and checked, or an error. */
function synth(tts, text) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const marks = [];
    const { audioStream, metadataStream } = tts.toStream(escapeXml(text));
    const timer = setTimeout(() => {
      try { audioStream.destroy(); } catch {}
      reject(new Error('timeout'));
    }, SYNTH_TIMEOUT_MS);
    metadataStream?.on('data', (chunk) => {
      try {
        for (const m of JSON.parse(chunk.toString()).Metadata || []) {
          if (m.Type === 'WordBoundary') marks.push([Math.round(m.Data.Offset / 10000), Math.round(m.Data.Duration / 10000)]);
        }
      } catch {}
    });
    metadataStream?.on('error', () => {});
    audioStream.on('data', (c) => chunks.push(c));
    audioStream.on('error', (e) => { clearTimeout(timer); reject(e); });
    audioStream.on('end', () => {
      clearTimeout(timer);
      const audio = Buffer.concat(chunks);
      const cut = cutReason(audio.length, text.length, marks);
      if (cut) reject(new Error(`cut: ${cut}`));
      else resolve(audio);
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const all = collectTexts();
  const missing = [...all].filter(([name]) => !existsSync(join(OUT, name)) || statSync(join(OUT, name)).size === 0);
  const todo = missing.slice(0, LIMIT);
  console.log(`${all.size} texts, ${all.size - missing.length} already recorded, ${todo.length} to record now with ${JOBS} jobs`);
  // recordings of texts the site no longer says (a question edited or removed): not kept in the site
  const stale = readdirSync(OUT).filter((f) => (f.endsWith('.mp3') && !all.has(f)) || f.endsWith('.tmp'));
  for (const f of stale) unlinkSync(join(OUT, f));
  if (stale.length) console.log(`${stale.length} old recordings deleted`);

  let done = 0, failed = 0;
  const started = Date.now();
  let next = 0;
  const worker = async () => {
    let tts = await newTts();
    while (next < todo.length) {
      const [name, text] = todo[next++];
      let ok = false;
      for (let attempt = 1; attempt <= MAX_TRIES && !ok; attempt++) {
        try {
          const audio = await synth(tts, text);
          const tmp = join(OUT, `${name}.tmp`);
          writeFileSync(tmp, audio);
          renameSync(tmp, join(OUT, name));
          // the silence Edge puts around the voice is cut, so it starts at once (needs ffmpeg)
          await trimFile(join(OUT, name)).catch((e) => {
            if (!warnedTrim) console.warn(`\nSilence not trimmed (is ffmpeg installed?): ${e?.message || e}`);
            warnedTrim = true;
          });
          ok = true;
        } catch (err) {
          // a hung or refused socket: a new connection, and a longer wait each time (Edge limits the rate)
          try { tts.close(); } catch {}
          await sleep(1000 * attempt * attempt);
          try { tts = await newTts(); } catch {}
          if (attempt === MAX_TRIES) console.warn(`\n✗ ${name} (${err?.message || err}): ${text.slice(0, 60)}`);
        }
      }
      ok ? done++ : failed++;
      if ((done + failed) % 25 === 0 || done + failed === todo.length) {
        const rate = (done + failed) / ((Date.now() - started) / 1000);
        const left = Math.round((todo.length - done - failed) / Math.max(rate, 0.01) / 60);
        process.stdout.write(`\r${done}/${todo.length} recorded, ${failed} failed, ~${left} min left   `);
      }
    }
    try { tts.close(); } catch {}
  };
  await Promise.all(Array.from({ length: Math.min(JOBS, todo.length) }, worker));
  console.log(`\nDone: ${done} recorded, ${failed} failed${failed ? ' (run again to retry them)' : ''}.`);
  process.exitCode = failed ? 1 : 0;
}

main();
