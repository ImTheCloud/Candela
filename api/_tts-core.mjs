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
const CACHE_HEADER = 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable';

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
    await tts.setMetadata(DEFAULT_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
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

function remember(key, buf) {
  cache.set(key, buf);
  cacheBytes += buf.length;
  while (cacheBytes > MAX_CACHE_BYTES && cache.size > 1) {
    const oldest = cache.keys().next().value;
    cacheBytes -= cache.get(oldest).length;
    cache.delete(oldest);
  }
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
    for (const res of this.subscribers) {
      if (!res.writableEnded) {
        try { res.end(); } catch {}
      }
    }
    this.subscribers.clear();
  }

  fail() {
    this.failed = true;
    for (const res of this.subscribers) sendError(res, 502, 'Speech synthesis failed');
    this.subscribers.clear();
  }
}

/** Reads `text` and `voice`, checks them, then answers with MP3 audio streamed as it is synthesised. */
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

    // 1. already synthesised by this instance
    const buf = cache.get(key);
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
    if (running) return running.subscribe(res, req);

    // 3. new synthesis, streamed to the client chunk by chunk as it arrives
    const stream = new InflightStream();
    inflight.set(key, stream);
    stream.subscribe(res, req);

    let timer = null;
    const fail = () => {
      clearTimeout(timer);
      if (inflight.get(key) === stream) inflight.delete(key);
      stream.fail();
      resetSharedTts();
    };

    try {
      const tts = await getSharedTts();
      const { audioStream } = tts.toStream(escapeXml(text));
      timer = setTimeout(() => {
        try { audioStream.destroy(); } catch {}
        fail();
      }, SYNTH_TIMEOUT_MS);
      audioStream.on('data', (chunk) => stream.write(chunk));
      audioStream.on('end', () => {
        clearTimeout(timer);
        if (inflight.get(key) === stream) inflight.delete(key);
        if (!stream.failed) {
          remember(key, Buffer.concat(stream.chunks));
          stream.end();
        }
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
