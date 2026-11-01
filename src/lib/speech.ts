import type { Playable } from './questions';

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof Audio !== 'undefined' || ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
}

let preferredVoice: SpeechSynthesisVoice | null = null;
let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Searches for the most natural, human-like Romanian voice available on this device as fallback.
 */
export function getBestRomanianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) return null;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;

  for (const v of voices) {
    let score = 0;
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();

    const isRo = lang.startsWith('ro') || lang.includes('ron') || name.includes('român') || name.includes('romanian');
    if (!isRo) continue;

    score += 100;
    if (/natural|neural|premium|enhanced/i.test(name)) score += 50;
    if (/google|siri|apple|ioana/i.test(name)) score += 30;
    if (v.default) score += 5;

    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }

  return best;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      preferredVoice = getBestRomanianVoice();
    };
    preferredVoice = getBestRomanianVoice();
  } catch {}
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
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
    } catch {}
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      activeUtterance = null;
      window.speechSynthesis.cancel();
    } catch {}
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
  if (activeAudio) {
    try {
      activeAudio.playbackRate = rate;
    } catch {}
  }
}

export function isCurrentlySpeaking(): boolean {
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Preloads audio in the background so it plays with 0 latency when requested.
 */
export function preloadText(text: string, voice = 'ro-RO-AlinaNeural'): void {
  if (typeof window === 'undefined') return;
  const clean = text.trim();
  if (!clean) return;
  const url = `/api/tts?text=${encodeURIComponent(clean)}&voice=${encodeURIComponent(voice)}`;
  fetch(url).catch(() => {});
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
 * Fallback to local device SpeechSynthesis if internet / server TTS is unavailable.
 */
function speakLocalText(text: string, options: SpeakOptions = {}): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
    options.onEnd?.();
    return () => {};
  }

  stopSpeaking();

  const synth = window.speechSynthesis;
  const utt = new SpeechSynthesisUtterance(text);
  activeUtterance = utt;

  utt.lang = 'ro-RO';
  const voice = preferredVoice || getBestRomanianVoice();
  if (voice) utt.voice = voice;

  utt.rate = options.rate ?? 0.75;
  utt.pitch = options.pitch ?? 1.0;

  utt.onstart = () => {
    options.onStart?.();
  };

  utt.onend = () => {
    if (activeUtterance === utt) {
      activeUtterance = null;
      options.onEnd?.();
    }
  };

  utt.onerror = (e) => {
    if (activeUtterance === utt) {
      activeUtterance = null;
      options.onError?.(e);
      options.onEnd?.();
    }
  };

  try {
    synth.speak(utt);
  } catch (err) {
    options.onError?.(err);
    options.onEnd?.();
  }

  return () => {
    if (activeUtterance === utt) {
      stopSpeaking();
    }
  };
}

/**
 * Speaks text using a natural human Romanian voice (Microsoft Azure Alina Neural via /api/tts),
 * with custom rate (default 0.75x for clear, relaxed pacing).
 */
export function speakText(text: string, options: SpeakOptions = {}): () => void {
  const clean = text.trim();
  if (!clean) {
    options.onEnd?.();
    return () => {};
  }

  stopSpeaking();

  let cancelled = false;

  // Use Neural Romanian Voice (Alina) via /api/tts
  if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
    try {
      const voice = options.voiceName || 'ro-RO-AlinaNeural';
      const url = `/api/tts?text=${encodeURIComponent(clean)}&voice=${encodeURIComponent(voice)}`;
      const audio = new Audio(url);
      activeAudio = audio;

      const rate = options.rate ?? 0.75;
      audio.playbackRate = rate;
      (audio as any).preservesPitch = true;

      audio.onplay = () => {
        if (!cancelled) options.onStart?.();
      };

      audio.onended = () => {
        if (activeAudio === audio) activeAudio = null;
        if (!cancelled) options.onEnd?.();
      };

      audio.onerror = () => {
        if (activeAudio === audio) activeAudio = null;
        if (!cancelled) {
          speakLocalText(clean, options);
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (activeAudio === audio) activeAudio = null;
          if (!cancelled) {
            speakLocalText(clean, options);
          }
        });
      }

      return () => {
        cancelled = true;
        if (activeAudio === audio) {
          stopSpeaking();
        }
      };
    } catch {
      // Fallback
    }
  }

  return speakLocalText(clean, options);
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
      // Prompt is already self-contained
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
  } = {}
): () => void {
  const text = buildQuestionSpeech(q);
  return speakText(text, {
    rate: options.rate ?? 0.75,
    onStart: options.onStart,
    onEnd: options.onEnd,
  });
}
