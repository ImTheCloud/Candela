import type { Playable } from './questions';

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof Audio !== 'undefined';
}

let activeAudio: HTMLAudioElement | null = null;
let currentPlaybackRate = 0.75; // default 0.75x for clear, relaxed natural pacing

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
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.src = '';
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

export function resumeSpeaking(): void {
  if (activeAudio && activeAudio.paused) {
    try {
      activeAudio.play().catch(() => {});
    } catch {}
  }
}

export function setSpeakingSpeed(rate: number): void {
  currentPlaybackRate = rate;
  if (activeAudio) {
    try {
      activeAudio.playbackRate = rate;
    } catch {}
  }
}

export function isCurrentlySpeaking(): boolean {
  return !!(activeAudio && !activeAudio.paused && !activeAudio.ended);
}

/**
 * Preloads audio in the background using HTML5 Audio so it plays with 0 latency.
 */
export function preloadText(text: string, voice = 'ro-RO-AlinaNeural'): void {
  if (typeof window === 'undefined') return;
  const clean = text.trim();
  if (!clean) return;
  try {
    const url = `/api/tts?text=${encodeURIComponent(clean)}&voice=${encodeURIComponent(voice)}`;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
  } catch {}
}

/**
 * Preloads question audio before the user navigates to it.
 */
export function preloadQuestionAudio(q: Playable): void {
  if (!q) return;
  const text = buildQuestionSpeech(q);
  preloadText(text);
}

/**
 * Speaks text using a natural human Romanian voice (Microsoft Azure Alina Neural via /api/tts),
 * with custom rate (default 0.75x). Never falls back to robotic SpeechSynthesis.
 */
export function speakText(text: string, options: SpeakOptions = {}): () => void {
  const clean = text.trim();
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

      const url = `/api/tts?text=${encodeURIComponent(clean)}&voice=${encodeURIComponent(voice)}`;
      const audio = new Audio(url);
      activeAudio = audio;

      audio.playbackRate = rate;
      (audio as any).preservesPitch = true;

      audio.onplay = () => {
        if (!cancelled) options.onStart?.();
      };

      audio.onended = () => {
        if (activeAudio === audio) activeAudio = null;
        if (!cancelled) options.onEnd?.();
      };

      audio.onerror = (e) => {
        if (activeAudio === audio) activeAudio = null;
        if (!cancelled) {
          options.onError?.(e);
          options.onEnd?.();
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (activeAudio === audio) activeAudio = null;
          if (!cancelled) {
            options.onError?.(err);
            options.onEnd?.();
          }
        });
      }

      return () => {
        cancelled = true;
        if (activeAudio === audio) {
          stopSpeaking();
        }
      };
    } catch (err) {
      options.onError?.(err);
      options.onEnd?.();
      return () => {};
    }
  }

  options.onEnd?.();
  return () => {};
}

function cleanText(s: string): string {
  return s.replace(/[*_#`]/g, '').trim();
}

/**
 * Builds clear, natural Romanian spoken text for a quiz question and its options.
 */
export function buildQuestionSpeech(q: Playable): string {
  const parts: string[] = [];

  // Question prompt
  if (q.t === 'fill') {
    const formatted = cleanText(q.q).replace(/_{2,}/g, '... spațiu liber ...');
    parts.push(`Completează: ${formatted}`);
  } else {
    parts.push(cleanText(q.q));
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
        parts.push(`Opțiunea ${letter}: ${cleanText(opt)}.`);
      });
      break;
    }

    case 'multi': {
      const letters = ['A', 'B', 'C', 'D', 'E'];
      q.opts.forEach((opt, idx) => {
        const letter = letters[idx] || String(idx + 1);
        parts.push(`Opțiunea ${letter}: ${cleanText(opt)}.`);
      });
      parts.push('Sau: Niciun răspuns corect.');
      break;
    }

    case 'match':
      parts.push('Asociază perechile corespunzătoare din stânga și din dreapta.');
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
