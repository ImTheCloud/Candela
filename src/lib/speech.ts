import type { Playable } from './questions';

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

let preferredVoice: SpeechSynthesisVoice | null = null;

/**
 * Searches for the most natural, human-like Romanian voice available on this device.
 * Prioritizes high-quality neural / natural / Siri / Google voices.
 */
export function getBestRomanianVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
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
    // Premium natural voices (Siri, Neural, Natural, Enhanced)
    if (/natural|neural|premium|enhanced/i.test(name)) score += 50;
    // Google / Apple / Ioana
    if (/google|siri|apple|ioana/i.test(name)) score += 30;
    if (v.default) score += 5;

    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }

  return best;
}

if (isSpeechSupported()) {
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
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  try {
    activeUtterance = null;
    window.speechSynthesis.cancel();
  } catch {}
}

export function isCurrentlySpeaking(): boolean {
  if (!isSpeechSupported()) return false;
  return window.speechSynthesis.speaking;
}

/**
 * Speaks text using the best natural Romanian voice.
 * Rate 0.93 provides a warm, natural and easily comprehensible pacing.
 */
export function speakText(text: string, options: SpeakOptions = {}): () => void {
  if (!isSpeechSupported() || !text.trim()) {
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

  utt.rate = options.rate ?? 0.93;
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
      parts.push('Varianta 1: Adevărat.');
      parts.push('Varianta 2: Fals.');
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
 * Speaks a full question and its options, handling lifecycle events.
 */
export function speakQuestion(
  q: Playable,
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  const text = buildQuestionSpeech(q);
  return speakText(text, {
    rate: 0.93,
    onStart,
    onEnd,
  });
}
