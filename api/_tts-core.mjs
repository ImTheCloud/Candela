// The text-to-speech core shared by the Vercel function (api/tts.ts) and the dev server (astro.config.mjs).
// Files starting with "_" in api/ are not turned into endpoints by Vercel.
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const DEFAULT_VOICE = 'ro-RO-AlinaNeural';
/** Closed list: the voice goes into the SSML and the synthesis metadata, so nothing else is accepted. */
const VOICES = new Set([DEFAULT_VOICE]);
/** The longest text spoken by the site is a multi question with its options (well under this). */
export const MAX_TEXT_LENGTH = 1500;
/** A synthesis that has not ended by then is dropped (the socket hung). */
const SYNTH_TIMEOUT_MS = 20000;
/** Rough cap on the audio kept in memory by a warm instance (~25 MB). */
const MAX_CACHE_BYTES = 25 * 1024 * 1024;
/**
 * Spoken Romanian at 48 kbit/s is about 400 bytes of MP3 per character of text. A synthesis that ends with far
 * less was cut by Edge: it is dropped (never cached) instead of being kept by browsers and the CDN for a year.
 */
const MIN_BYTES_PER_CHAR = 120;
const MIN_AUDIO_BYTES = 2000;
const CACHE_HEADER = 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable';

/** key -> { audio: Buffer, marks: [startMs, durationMs, word][] } */
const cache = new Map();
let cacheBytes = 0;
const inflight = new Map();

let sharedTts = null;
let sharedTtsPromise = null;

function getSharedTts() {
  if (sharedTts) return Promise.resolve(sharedTts);
  if (sharedTtsPromise) return sharedTtsPromise;
  sharedTtsPromise = (async () => {
    const tts = new MsEdgeTTS();
    // word boundaries: the Bible reader lights up each word as it is read
    await tts.setMetadata(DEFAULT_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
    sharedTts = tts;
    sharedTtsPromise = null;
    return tts;
  })().catch((err) => {
    sharedTts = null;
    sharedTtsPromise = null;
    throw err;
  });
  return sharedTtsPromise;
}

function resetSharedTts() {
  if (sharedTts) {
    try { sharedTts.close(); } catch {}
    sharedTts = null;
  }
  sharedTtsPromise = null;
}

/** msedge-tts pastes the text into SSML as is: escape it, or "<" and "&" break the synthesis and tags get injected. */
function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function remember(key, entry) {
  cache.set(key, entry);
  cacheBytes += entry.audio.length;
  while (cacheBytes > MAX_CACHE_BYTES && cache.size > 1) {
    const oldest = cache.keys().next().value;
    cacheBytes -= cache.get(oldest).audio.length;
    cache.delete(oldest);
  }
}

/** Edge sends its word boundaries as JSON chunks, times in 100 ns ticks. */
function readMarks(chunk, marks) {
  try {
    for (const m of JSON.parse(chunk.toString()).Metadata || []) {
      if (m.Type !== 'WordBoundary') continue;
      const word = m.Data?.text?.Text;
      if (word) marks.push([Math.round(m.Data.Offset / 10000), Math.round(m.Data.Duration / 10000), word]);
    }
  } catch {}
}

function sendMarks(res, marks) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', CACHE_HEADER);
  res.end(JSON.stringify(marks));
}

function sendError(res, status, message) {
  if (res.headersSent) {
    // a 200 is already on its way: cut the connection so no cache keeps a truncated file
    try { res.destroy(); } catch {}
    return;
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(message);
}

class InflightStream {
  chunks = [];
  marks = [];
  /** requests for the word times only: answered once the synthesis is over */
  waitingMarks = new Set();
  subscribers = new Set();
  ended = false;
  failed = false;

  subscribe(res, req) {
    if (this.failed) return sendError(res, 502, 'Speech synthesis failed');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', CACHE_HEADER);
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    for (const chunk of this.chunks) res.write(chunk);
    if (this.ended) return res.end();
    this.subscribers.add(res);
    req.on?.('close', () => this.subscribers.delete(res));
  }

  write(chunk) {
    this.chunks.push(chunk);
    for (const res of this.subscribers) {
      if (!res.writableEnded) {
        try { res.write(chunk); } catch {}
      }
    }
  }

  end() {
    this.ended = true;
    for (const res of this.waitingMarks) sendMarks(res, this.marks);
    this.waitingMarks.clear();
    for (const res of this.subscribers) {
      if (!res.writableEnded) {
        try { res.end(); } catch {}
      }
    }
    this.subscribers.clear();
  }

  fail() {
    this.failed = true;
    for (const res of this.waitingMarks) sendError(res, 502, 'Speech synthesis failed');
    this.waitingMarks.clear();
    for (const res of this.subscribers) sendError(res, 502, 'Speech synthesis failed');
    this.subscribers.clear();
  }
}

/**
 * Reads `text` and `voice`, checks them, then answers with MP3 audio streamed as it is synthesised,
 * or with `marks` set, the time of each word as JSON: [[startMs, durationMs, word], ...].
 */
export async function handleTts(req, res, params) {
  try {
    const rawText = params.text;
    const rawVoice = params.voice;
    const text = typeof rawText === 'string' ? rawText.replace(/\s+/g, ' ').trim() : '';
    const voice = typeof rawVoice === 'string' && rawVoice ? rawVoice : DEFAULT_VOICE;

    if (!text) return sendError(res, 400, 'Missing text parameter');
    if (text.length > MAX_TEXT_LENGTH) return sendError(res, 400, 'Text too long');
    if (!VOICES.has(voice)) return sendError(res, 400, 'Unsupported voice');

    const key = `${voice}:${text}`;
    const wantsMarks = params.marks === '1';

    // 1. already synthesised by this instance
    const hit = cache.get(key);
    if (hit && wantsMarks) return sendMarks(res, hit.marks);
    const buf = hit?.audio;
    if (buf) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buf.length);
      res.setHeader('Cache-Control', CACHE_HEADER);
      res.setHeader('Accept-Ranges', 'bytes');
      return res.end(buf);
    }

    // 2. being synthesised: join the same stream
    const running = inflight.get(key);
    if (running && wantsMarks) return void running.waitingMarks.add(res);
    if (running) return running.subscribe(res, req);

    // 3. new synthesis, streamed to the client chunk by chunk as it arrives
    const stream = new InflightStream();
    inflight.set(key, stream);
    if (wantsMarks) stream.waitingMarks.add(res);
    else stream.subscribe(res, req);

    let timer = null;
    const fail = () => {
      clearTimeout(timer);
      if (inflight.get(key) === stream) inflight.delete(key);
      stream.fail();
      resetSharedTts();
    };

    try {
      const tts = await getSharedTts();
      const { audioStream, metadataStream } = tts.toStream(escapeXml(text));
      metadataStream?.on('data', (chunk) => readMarks(chunk, stream.marks));
      metadataStream?.on('error', () => {});
      timer = setTimeout(() => {
        try { audioStream.destroy(); } catch {}
        fail();
      }, SYNTH_TIMEOUT_MS);
      audioStream.on('data', (chunk) => stream.write(chunk));
      audioStream.on('end', () => {
        clearTimeout(timer);
        if (stream.failed) return;
        const audio = Buffer.concat(stream.chunks);
        if (audio.length < Math.max(MIN_AUDIO_BYTES, text.length * MIN_BYTES_PER_CHAR)) {
          console.error(`TTS audio cut short: ${audio.length} bytes for ${text.length} characters`);
          return fail();
        }
        if (inflight.get(key) === stream) inflight.delete(key);
        remember(key, { audio, marks: stream.marks });
        stream.end();
      });
      audioStream.on('error', (err) => {
        console.error('TTS stream error:', err?.message || err);
        fail();
      });
    } catch (err) {
      console.error('TTS synthesis error:', err?.message || err);
      fail();
    }
  } catch (err) {
    console.error('TTS handler error:', err?.message || err);
    sendError(res, 500, 'Internal error');
  }
}
