import type { Playable } from './questions';

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof Audio !== 'undefined';
}

const SPEED_STORAGE_KEY = 'candela_audio_speed';
export const VALID_SPEAKING_SPEEDS = [0.75, 1, 1.25];

export function getSavedSpeakingSpeed(): number {
  if (typeof window === 'undefined') return 1.0;
  try {
    const raw = localStorage.getItem(SPEED_STORAGE_KEY);
    if (raw) {
      const val = parseFloat(raw);
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
const preloadQueue: (() => void)[] = [];

function runPreload<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      runningPreloads++;
      task().then(resolve, reject).finally(() => {
        runningPreloads--;
        preloadQueue.shift()?.();
      });
    };
    if (runningPreloads < MAX_PARALLEL_PRELOADS) start();
    else preloadQueue.push(start);
  });
}

/** The user asked the browser to save data: no audio is fetched before it is asked for. */
export function savesData(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as any).connection?.saveData;
}

function ttsUrl(clean: string, voice: string): string {
  return `/api/tts?text=${encodeURIComponent(clean)}&voice=${encodeURIComponent(voice)}`;
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

export interface SpeakOptions {
  rate?: number;
  voiceName?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

export function stopSpeaking(): void {
  if (activeAudio) {
    try {
      activeAudio.onplay = null;
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.removeAttribute('src');
      activeAudio.load();
    } catch {}
    activeAudio = null;
  }
}

export function pauseSpeaking(): void {
  if (activeAudio && !activeAudio.paused) {
    try {
      activeAudio.pause();
    } catch {}
  }
}

export function resumeSpeaking(): boolean {
  if (activeAudio && !activeAudio.ended && activeAudio.paused) {
    try {
      const p = activeAudio.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Maps requested UI speed multiplier to calibrated, high-fidelity audio playback rate.
 * A raw 0.75x rate stretches audio excessively, causing robotic phase artifacts, slurred vowels,
 * and an unnatural dragging "rallonge" sensation in Romanian.
 * Calibrating 0.75x to 0.85x produces a peaceful, articulate, relaxed cadence that sounds
 * completely human and natural, with zero vowel distortion.
 */
export function getEffectivePlaybackRate(rate: number): number {
  if (rate <= 0.75) {
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
 */
export function preloadText(text: string, voice = 'ro-RO-AlinaNeural'): Promise<string> {
  if (typeof window === 'undefined') return Promise.resolve('');
  const clean = cleanSpeechText(text);
  if (!clean) return Promise.resolve('');

  const key = `${voice}:${clean}`;
  const ready = readyUrlCache.get(key);
  if (ready) {
    // most recently used goes last, so it is evicted last
    readyUrlCache.delete(key);
    readyUrlCache.set(key, ready);
    return Promise.resolve(ready);
  }
  const running = inflightFetches.get(key);
  if (running) return running;

  const url = ttsUrl(clean, voice);
  const fetchPromise = runPreload(() => fetch(url))
    .then((res) => {
      if (!res.ok) throw new Error(`TTS status ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      readyUrlCache.set(key, blobUrl);
      inflightFetches.delete(key);
      trimCache();
      return blobUrl;
    })
    .catch(() => {
      inflightFetches.delete(key);
      return url;
    });

  inflightFetches.set(key, fetchPromise);
  return fetchPromise;
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
 */
export function speakText(text: string, options: SpeakOptions = {}): () => void {
  const clean = cleanSpeechText(text);
  if (!clean) {
    options.onEnd?.();
    return () => {};
  }

  stopSpeaking();

  let cancelled = false;

  if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
    try {
      const voice = options.voiceName || 'ro-RO-AlinaNeural';
      const rate = options.rate ?? currentPlaybackRate;
      currentPlaybackRate = rate;

      const key = `${voice}:${clean}`;
      const directUrl = ttsUrl(clean, voice);

      const audio = activeAudio || new Audio();
      activeAudio = audio;
      audio.playbackRate = getEffectivePlaybackRate(rate);
      (audio as any).preservesPitch = true;

      audio.onplay = () => {
        if (!cancelled) options.onStart?.();
      };

      audio.onended = () => {
        if (!cancelled) options.onEnd?.();
      };

      const handleError = (err?: any) => {
        if (!cancelled) {
          if (options.onError) {
            options.onError(err);
          } else {
            options.onEnd?.();
          }
        }
      };

      audio.onerror = (e) => {
        handleError(e);
      };

      const startPlayback = (src: string) => {
        if (cancelled || activeAudio !== audio) return;
        if (audio.src !== src) {
          audio.src = src;
        }
        audio.currentTime = 0;
        audio.playbackRate = getEffectivePlaybackRate(rate);
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            handleError(err);
          });
        }
      };

      // 1. If preloaded blob URL is already in RAM, play IMMEDIATELY (0ms latency!)
      const cachedBlob = readyUrlCache.get(key);
      if (cachedBlob) {
        readyUrlCache.delete(key);
        readyUrlCache.set(key, cachedBlob);
      }
      if (cachedBlob) {
        startPlayback(cachedBlob);
      } else {
        // 2. Not yet in RAM cache: stream directly via audio URL IMMEDIATELY (zero waiting!)
        // and trigger background preload to populate the RAM cache for any subsequent replay
        startPlayback(directUrl);
        if (!savesData()) preloadText(clean, voice).catch(() => {});
      }

      return () => {
        cancelled = true;
        if (activeAudio === audio) {
          stopSpeaking();
        }
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

  options.onEnd?.();
  return () => {};
}

/**
 * Builds clear, natural Romanian spoken text for a quiz question and its options.
 */
export function buildQuestionSpeech(q: Playable): string {
  const parts: string[] = [];

  // Question prompt
  if (q.t === 'fill') {
    const formatted = cleanSpeechText(q.q).replace(/_{2,}/g, '... spațiu liber ...');
    parts.push(`Completează: ${formatted}`);
  } else if (q.t === 'match') {
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

    case 'fill':
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
  } = {}
): () => void {
  const text = buildQuestionSpeech(q);
  return speakText(text, {
    rate: options.rate ?? currentPlaybackRate,
    onStart: options.onStart,
    onEnd: options.onEnd,
    onError: options.onError,
  });
}
