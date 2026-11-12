import type { Playable } from './questions';

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof Audio !== 'undefined';
}

const SPEED_STORAGE_KEY = 'candela_audio_speed';
export const VALID_SPEAKING_SPEEDS = [0.65, 0.75, 1, 1.25];

export function getSavedSpeakingSpeed(): number {
  if (typeof window === 'undefined') return 1.0;
  try {
    const raw = localStorage.getItem(SPEED_STORAGE_KEY);
    if (raw) {
      const val = parseFloat(raw);
      if (val === 0.5) return 0.65;
      if (VALID_SPEAKING_SPEEDS.includes(val)) return val;
    }
  } catch {}
  return 1.0;
}

export function saveSpeakingSpeed(rate: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SPEED_STORAGE_KEY, String(rate));
  } catch {}
}


let activeAudio: HTMLAudioElement | null = null;
let currentPlaybackRate = typeof window !== 'undefined' ? getSavedSpeakingSpeed() : 1.0;

// In-memory cache of audio URLs (blob URLs created from background fetch for 0ms latency)
const readyUrlCache = new Map<string, string>();
const inflightFetches = new Map<string, Promise<string>>();
const MAX_CACHE_SIZE = 150;
// Background fetches run a few at a time, so scrolling fast through questions or chapters never floods the network
const MAX_PARALLEL_PRELOADS = 3;
let runningPreloads = 0;
/** waiting background fetches, by text: the one that must be heard now jumps the queue */
const preloadQueue = new Map<string, () => void>();

function runPreload<T>(key: string, task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      preloadQueue.delete(key);
      runningPreloads++;
      task().then(resolve, reject).finally(() => {
        runningPreloads--;
        const next = preloadQueue.values().next().value;
        next?.();
      });
    };
    if (runningPreloads < MAX_PARALLEL_PRELOADS) start();
    else preloadQueue.set(key, start);
  });
}

/** The user asked the browser to save data: no audio is fetched before it is asked for. */
export function savesData(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as any).connection?.saveData;
}

// Bumped when audio already kept by browsers or the CDN must be fetched again (a cut file is kept for a year).
// 3: the server let files cut in their second half through (2 Samuel 14:32) until it compared them to the word times
const TTS_VERSION = '3';

function ttsUrl(clean: string, voice: string, fresh = false): string {
  const url = `/api/tts?text=${encodeURIComponent(clean)}&voice=${encodeURIComponent(voice)}&v=${TTS_VERSION}`;
  // a URL of its own: neither the browser, the CDN nor the server's memory can answer with the broken copy again
  return fresh ? `${url}&fresh=${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` : url;
}

/**
 * The voice says about 16 characters a second (0.058 to 0.064 s per character at 1x, 385 to 475 bytes of MP3).
 * A file far shorter than its text was cut. The server drops anything under 200 bytes per character,
 * so these looser limits only catch copies kept from before that check.
 */
const MIN_BYTES_PER_CHAR = 150;
const MIN_SECONDS_PER_CHAR = 0.03;
const minBytes = (clean: string) => Math.max(2000, clean.length * MIN_BYTES_PER_CHAR);
const minSeconds = (clean: string) => clean.length * MIN_SECONDS_PER_CHAR;
/** Longer than the server's own 20 s limit on a synthesis */
const FETCH_TIMEOUT_MS = 25000;
/** No sound coming out this long after play(), or the position frozen this long: the file is reloaded */
const START_TIMEOUT_MS = 8000;
const STALL_TIMEOUT_MS = 8000;
/** New copies asked of the server before a text is given up (with a short wait between them) */
const MAX_REGENERATIONS = 3;

/** Downloads the whole file and checks it before anything is played: an audio element is never given the network URL. */
async function fetchAudio(url: string, clean: string, cache: RequestCache = 'default'): Promise<string> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null;
  try {
    const res = await fetch(url, { cache, signal: ctrl?.signal });
    if (!res.ok) throw new Error(`TTS status ${res.status}`);
    const blob = await res.blob();
    if (blob.size < minBytes(clean)) throw new Error(`Audio cut short: ${blob.size} bytes for ${clean.length} characters`);
    return URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'audio/mpeg' }));
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function keep(key: string, blobUrl: string): void {
  const old = readyUrlCache.get(key);
  readyUrlCache.delete(key);
  readyUrlCache.set(key, blobUrl);
  if (old && old !== blobUrl && !(activeAudio && activeAudio.src === old)) {
    try { URL.revokeObjectURL(old); } catch {}
  }
  trimCache();
}

/** Drops the least recently used audio; the one playing right now is never revoked. */
function trimCache(): void {
  for (const [key, url] of readyUrlCache) {
    if (readyUrlCache.size <= MAX_CACHE_SIZE) return;
    if (activeAudio && activeAudio.src === url) continue;
    try { URL.revokeObjectURL(url); } catch {}
    readyUrlCache.delete(key);
  }
}

/** The checked file of a text, from memory, from a fetch already running, or downloaded now. Rejects when it cannot be had. */
function loadAudio(clean: string, voice: string, urgent: boolean): Promise<string> {
  const key = `${voice}:${clean}`;
  const ready = readyUrlCache.get(key);
  if (ready) {
    // most recently used goes last, so it is evicted last
    readyUrlCache.delete(key);
    readyUrlCache.set(key, ready);
    return Promise.resolve(ready);
  }
  const running = inflightFetches.get(key);
  if (running) {
    if (urgent) preloadQueue.get(key)?.();
    return running;
  }
  const task = () => fetchAudio(ttsUrl(clean, voice), clean).then((blobUrl) => {
    keep(key, blobUrl);
    return blobUrl;
  });
  const p = (urgent ? task() : runPreload(key, task)).finally(() => {
    if (inflightFetches.get(key) === p) inflightFetches.delete(key);
  });
  inflightFetches.set(key, p);
  return p;
}

/** A copy that would not play: a new one is synthesised, and the browser's cached copy is replaced in the background. */
function regenerateAudio(clean: string, voice: string): Promise<string> {
  const key = `${voice}:${clean}`;
  const bad = readyUrlCache.get(key);
  if (bad) readyUrlCache.delete(key);
  return fetchAudio(ttsUrl(clean, voice, true), clean, 'no-store').then((blobUrl) => {
    keep(key, blobUrl);
    if (bad && !(activeAudio && activeAudio.src === bad)) {
      try { URL.revokeObjectURL(bad); } catch {}
    }
    // the next visit asks the usual URL again: overwrite what the browser kept for it
    fetch(ttsUrl(clean, voice), { cache: 'reload' }).catch(() => {});
    return blobUrl;
  });
}

export interface SpeakOptions {
  rate?: number;
  voiceName?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
  /** The phone paused the sound on its own (a call, another app, the headphones taken off) */
  onPause?: () => void;
}

// One audio element for the whole visit: iOS lets an element that was started by a tap keep playing
// the next verses while the phone is locked, a new element would need a new tap
let sharedAudio: HTMLAudioElement | null = null;
// Bumped by every new text and every stop: events of an older text are ignored
let playGen = 0;
// Paused with the button (not by the phone): a file arriving meanwhile waits for "resume"
let pausedByUser = false;
// The text being read: what resume and stop act on
let current: { resume: () => void; dispose: () => void } | null = null;

let silence: string | null = null;
/** 50 ms of silent WAV: played at once inside the tap while the real file downloads, so iOS lets it play afterwards */
function silentClip(): string {
  if (silence) return silence;
  const n = 400;
  const bytes = new Uint8Array(44 + n);
  const v = new DataView(bytes.buffer);
  const str = (o: number, s: string) => { for (let k = 0; k < s.length; k++) bytes[o + k] = s.charCodeAt(k); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true);
  bytes.fill(128, 44);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return (silence = `data:audio/wav;base64,${btoa(bin)}`);
}

/** Safari 16.4+: Candela's voice is playback (like a podcast), never muted by the game sounds' audio session */
export function claimPlaybackSession(): void {
  try {
    const s = (navigator as any).audioSession;
    if (s && s.type !== 'playback') s.type = 'playback';
  } catch {}
}

function detach(audio: HTMLAudioElement): void {
  audio.onplay = null;
  audio.onplaying = null;
  audio.onpause = null;
  audio.onended = null;
  audio.onerror = null;
  audio.onloadedmetadata = null;
}

export function stopSpeaking(): void {
  playGen++;
  pausedByUser = false;
  current?.dispose();
  current = null;
  if (activeAudio) {
    try {
      detach(activeAudio);
      activeAudio.pause();
      activeAudio.removeAttribute('src');
      activeAudio.load();
    } catch {}
    activeAudio = null;
  }
  setMediaPlaybackState('none');
}

export function pauseSpeaking(): void {
  pausedByUser = true;
  if (activeAudio && !activeAudio.paused) {
    try {
      activeAudio.pause();
    } catch {}
  }
  setMediaPlaybackState('paused');
}

/** Goes on from where the reading was paused (or starts the file that arrived meanwhile); false when there is nothing to resume. */
export function resumeSpeaking(): boolean {
  if (!current || !activeAudio || activeAudio.ended) return false;
  pausedByUser = false;
  current.resume();
  setMediaPlaybackState('playing');
  return true;
}

/**
 * Maps requested UI speed multiplier to calibrated, high-fidelity audio playback rate.
 * A raw 0.75x rate stretches audio excessively, causing robotic phase artifacts, slurred vowels,
 * and an unnatural dragging "rallonge" sensation in Romanian.
 * Calibrating 0.75x to 0.85x produces a peaceful, articulate, relaxed cadence that sounds
 * completely human and natural, with zero vowel distortion.
 */
export function getEffectivePlaybackRate(rate: number): number {
  if (rate === 0.75) {
    return 0.85;
  }
  return rate;
}

export function setSpeakingSpeed(rate: number): void {
  currentPlaybackRate = rate;
  saveSpeakingSpeed(rate);
  if (activeAudio) {
    try {
      activeAudio.playbackRate = getEffectivePlaybackRate(rate);
    } catch {}
  }
}

export function isCurrentlySpeaking(): boolean {
  return !!(activeAudio && !activeAudio.paused && !activeAudio.ended);
}

export function cleanSpeechText(s: unknown): string {
  return String(s ?? '')
    .replace(/[*_#`]/g, '')
    .replace(/["'„”«»“”’‘‚‛]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Preloads audio in the background using fetch + blob URL.
 * Works seamlessly across mobile browsers (iOS Safari, Android Chrome) which block
 * media element autoplay/preload without user gestures, but allow background fetch.
 * Resolves with the blob URL, or '' when the file could not be had (it is asked again when it is played).
 */
export function preloadText(text: string, voice = 'ro-RO-AlinaNeural'): Promise<string> {
  if (typeof window === 'undefined') return Promise.resolve('');
  const clean = cleanSpeechText(text);
  if (!clean) return Promise.resolve('');
  return loadAudio(clean, voice, false).catch(() => '');
}

/**
 * Preloads question audio before the user navigates to it.
 */
export function preloadQuestionAudio(q: Playable): Promise<string> {
  if (!q || savesData()) return Promise.resolve('');
  return preloadText(buildQuestionSpeech(q));
}

/**
 * Speaks text using a natural human Romanian voice (Microsoft Azure Alina Neural via /api/tts),
 * with custom rate (default 1.0x). Zero robotic SpeechSynthesis.
 *
 * The reading always gets to the end of the text or reports an error: a file that will not load, will not start,
 * freezes, or ends long before its text should, is synthesised again and the reading goes on where it stopped.
 */
export function speakText(text: string, options: SpeakOptions = {}): () => void {
  const clean = cleanSpeechText(text);
  if (!clean) {
    options.onEnd?.();
    return () => {};
  }

  stopSpeaking();

  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    options.onEnd?.();
    return () => {};
  }

  let cancelled = false;
  try {
    claimPlaybackSession();
    const voice = options.voiceName || 'ro-RO-AlinaNeural';
    const rate = options.rate ?? currentPlaybackRate;
    currentPlaybackRate = rate;

    const gen = ++playGen;
    const audio = sharedAudio || (sharedAudio = new Audio());
    activeAudio = audio;
    (audio as any).preservesPitch = true;
    // a newer text took over (fast taps on verses or questions): this one stays silent
    const stale = () => cancelled || gen !== playGen;

    let finished = false;
    let regenerations = 0;
    let regenerating = false;
    let src = '';
    let resumeAt = 0;
    let started = false;
    let watch: ReturnType<typeof setInterval> | null = null;
    let wait: ReturnType<typeof setTimeout> | null = null;

    const dispose = () => {
      if (watch) clearInterval(watch);
      if (wait) clearTimeout(wait);
      watch = wait = null;
    };

    const fail = (err?: any) => {
      if (stale() || finished) return;
      finished = true;
      dispose();
      console.warn('Audio could not be played:', err);
      if (options.onError) options.onError(err);
      else options.onEnd?.();
    };

    // A copy that will not play: a new one from the server, the reading goes on where it stopped
    const recover = (err?: any, at = 0) => {
      if (stale() || finished || regenerating) return;
      if (regenerations >= MAX_REGENERATIONS) return fail(err);
      regenerating = true;
      const attempt = regenerations++;
      dispose();
      console.warn('Audio reloaded after:', err?.message || err?.name || err);
      wait = setTimeout(() => {
        regenerateAudio(clean, voice)
          .then((url) => {
            regenerating = false;
            if (!stale() && !finished) play(url, at);
          })
          .catch((e) => {
            regenerating = false;
            recover(e, at);
          });
      }, attempt * 1000);
    };

    // Watches the sound actually coming out: nothing within START_TIMEOUT_MS, or the position frozen for STALL_TIMEOUT_MS
    const arm = () => {
      if (watch) clearInterval(watch);
      let lastPos = -1;
      let lastMove = Date.now();
      const since = Date.now();
      watch = setInterval(() => {
        if (stale() || finished) return dispose();
        if (pausedByUser || audio.ended) {
          lastMove = Date.now();
          return;
        }
        if (audio.currentTime !== lastPos) {
          lastPos = audio.currentTime;
          lastMove = Date.now();
          return;
        }
        if (audio.paused) return; // paused by the phone: reported by onpause, resumed by the user
        if (!started && Date.now() - since > START_TIMEOUT_MS) return recover(new Error('Audio did not start'), resumeAt);
        if (started && Date.now() - lastMove > STALL_TIMEOUT_MS) {
          return recover(new Error('Audio froze'), Math.max(0, audio.currentTime - 0.5));
        }
      }, 1000);
    };

    const go = () => {
      if (stale() || finished || pausedByUser) return;
      audio.playbackRate = getEffectivePlaybackRate(currentPlaybackRate);
      arm();
      const p = audio.play();
      p?.catch((err) => {
        if (stale() || finished || err?.name === 'AbortError') return;
        // the browser wants a tap first: not a broken file, the reading waits for the button
        if (err?.name === 'NotAllowedError') return fail(err);
        recover(err, resumeAt);
      });
    };

    const play = (url: string, at = 0) => {
      if (stale() || finished) return;
      src = url;
      resumeAt = at;
      started = false;
      audio.onloadedmetadata = () => {
        if (stale() || audio.src !== src) return;
        const d = audio.duration;
        if (Number.isFinite(d) && d > 0 && d < minSeconds(clean)) {
          return recover(new Error(`Audio cut short: ${d.toFixed(1)} s for ${clean.length} characters`), at);
        }
        if (at > 0 && at < d) {
          try { audio.currentTime = at; } catch {}
        }
      };
      audio.onplay = () => {
        if (stale() || audio.src !== src) return;
        setMediaPlaybackState('playing');
        options.onStart?.();
      };
      audio.onplaying = () => {
        if (stale() || audio.src !== src) return;
        started = true;
        // iOS resets the rate when the file changes
        audio.playbackRate = getEffectivePlaybackRate(currentPlaybackRate);
      };
      audio.onpause = () => {
        // only a pause in the middle of the sound: not the one a new file or the end of the file brings
        if (stale() || finished || !started || audio.src !== src || pausedByUser || audio.ended) return;
        if (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration - 0.05) return;
        setMediaPlaybackState('paused');
        options.onPause?.();
      };
      audio.onended = () => {
        if (stale() || finished || audio.src !== src) return;
        // ended long before the text should have: the end of the file is missing
        const reached = audio.currentTime || audio.duration || 0;
        if (reached < minSeconds(clean)) {
          return recover(new Error(`Audio ended after ${reached.toFixed(1)} s for ${clean.length} characters`), Math.max(0, reached - 1));
        }
        finished = true;
        dispose();
        options.onEnd?.();
      };
      audio.onerror = () => {
        if (stale() || finished || audio.src !== src) return;
        recover(audio.error ?? new Error('Audio error'), Math.max(resumeAt, audio.currentTime - 0.5));
      };
      audio.src = url;
      go();
    };

    current = {
      resume: () => {
        if (stale() || finished) return;
        if (audio.src === src && src) go();
      },
      dispose,
    };

    const key = `${voice}:${clean}`;
    const cached = readyUrlCache.get(key);
    if (cached) {
      // 1. already downloaded and checked: plays at once (and is now the most recently used)
      readyUrlCache.delete(key);
      readyUrlCache.set(key, cached);
      play(cached);
    } else {
      // 2. downloaded first (Safari plays a network URL badly: the server streams it without byte ranges).
      // Meanwhile a silent clip is started inside the tap, so iOS lets the real file play when it arrives.
      detach(audio);
      audio.src = silentClip();
      audio.play()?.catch(() => {});
      loadAudio(clean, voice, true)
        .then((url) => play(url))
        .catch((err) => recover(err));
    }

    return () => {
      cancelled = true;
      if (gen === playGen) stopSpeaking();
    };
  } catch (err) {
    if (options.onError) {
      options.onError(err);
    } else {
      options.onEnd?.();
    }
    return () => {};
  }
}

/**
 * Builds clear, natural Romanian spoken text for a quiz question and its options.
 */
export function buildQuestionSpeech(q: Playable): string {
  const parts: string[] = [];

  // Question prompt
  if (q.t === 'match') {
    // Only speak the single, clean instruction once (no duplicate sentence)
    parts.push('Asociază perechile din stânga și din dreapta.');
  } else {
    parts.push(cleanSpeechText(q.q));
  }

  // Question options
  switch (q.t) {
    case 'tf':
      // For true/false: natural Romanian prompt, no robotic "varianta 1 / varianta 2"
      parts.push('Adevărat sau fals.');
      break;

    case 'one': {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      q.opts.forEach((opt, idx) => {
        const letter = letters[idx] || String(idx + 1);
        parts.push(`Răspunsul ${letter}: ${cleanSpeechText(opt)}.`);
      });
      break;
    }

    case 'multi': {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      q.opts.forEach((opt, idx) => {
        const letter = letters[idx] || String(idx + 1);
        parts.push(`Răspunsul ${letter}: ${cleanSpeechText(opt)}.`);
      });
      parts.push('Sau: Niciun răspuns corect.');
      parts.push('Pot fi corecte: niciuna, una, două sau trei variante.');
      break;
    }

    case 'match':
      // Handled above in question prompt to avoid repeating two phrases
      break;
  }

  return parts.join('\n');
}

/**
 * Speaks a full question and its options with natural human voice, handling lifecycle events.
 */
export function speakQuestion(
  q: Playable,
  options: {
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err?: any) => void;
    onPause?: () => void;
  } = {}
): () => void {
  const text = buildQuestionSpeech(q);
  return speakText(text, {
    rate: options.rate ?? currentPlaybackRate,
    onStart: options.onStart,
    onEnd: options.onEnd,
    onError: options.onError,
    onPause: options.onPause,
  });
}

export interface MediaSessionInfo {
  title: string;
  album?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onStop?: () => void;
}

const MEDIA_ACTIONS = ['play', 'pause', 'nexttrack', 'previoustrack', 'stop'] as const;

/**
 * What the lock screen, the car and the headphones show and control while Candela reads:
 * the title, play/pause and, in the Bible reader, the next or previous verse. null clears it.
 */
export function setMediaSession(info: MediaSessionInfo | null): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = info
      ? new MediaMetadata({
          title: info.title,
          artist: 'Candela',
          album: info.album ?? '',
          artwork: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        })
      : null;
  } catch {}
  const handlers: Record<(typeof MEDIA_ACTIONS)[number], (() => void) | undefined> = {
    play: info?.onPlay,
    pause: info?.onPause,
    nexttrack: info?.onNext,
    previoustrack: info?.onPrevious,
    stop: info?.onStop,
  };
  for (const action of MEDIA_ACTIONS) {
    const fn = handlers[action];
    try { ms.setActionHandler(action, fn ? () => fn() : null); } catch {}
  }
  if (!info) setMediaPlaybackState('none');
}

function setMediaPlaybackState(state: MediaSessionPlaybackState): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try { navigator.mediaSession.playbackState = state; } catch {}
}
