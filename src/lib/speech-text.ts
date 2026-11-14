// What Candela says out loud, and the name of the ready-made file that says it.
// Pure code with no browser API: shared by the site (src/lib/speech.ts) and by
// scripts/generate-audio.mjs, which synthesises every verse and question ahead of time.
import type { Playable } from './questions';

export const DEFAULT_VOICE = 'ro-RO-AlinaNeural';

/**
 * Bumped when every ready-made file must be made again (another voice, format or pronunciation):
 * the file names change, so neither browsers nor the CDN can answer with an old copy.
 */
export const AUDIO_FILES_VERSION = '1';

export function cleanSpeechText(s: unknown): string {
  return String(s ?? '')
    .replace(/[*_#`]/g, '')
    .replace(/["'„”«»“”’‘‚‛]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** What the Bible reader says before verse 1 when it goes on to the next chapter. */
export function chapterAnnouncement(ch: number): string {
  return `Capitolul ${ch}.`;
}

/**
 * Builds clear, natural Romanian spoken text for a quiz question and its options.
 */
export function buildQuestionSpeech(q: Pick<Playable, 't'> & { q?: string; opts?: string[] }): string {
  const parts: string[] = [];

  // Question prompt
  if (q.t === 'match') {
    // Only speak the single, clean instruction once (no duplicate sentence)
    parts.push('Asociază perechile din stânga și din dreapta.');
  } else {
    parts.push(cleanSpeechText(q.q));
  }

  const letters = ['A', 'B', 'C', 'D', 'E'];
  switch (q.t) {
    case 'tf':
      // For true/false: natural Romanian prompt, no robotic "varianta 1 / varianta 2"
      parts.push('Adevărat sau fals.');
      break;

    case 'one':
      (q.opts ?? []).forEach((opt, idx) => {
        parts.push(`Răspunsul ${letters[idx] || String(idx + 1)}: ${cleanSpeechText(opt)}.`);
      });
      break;

    case 'multi':
      (q.opts ?? []).forEach((opt, idx) => {
        parts.push(`Răspunsul ${letters[idx] || String(idx + 1)}: ${cleanSpeechText(opt)}.`);
      });
      parts.push('Sau: Niciun răspuns corect.');
      parts.push('Pot fi corecte: niciuna, una, două sau trei variante.');
      break;

    case 'match':
      // Handled above in question prompt to avoid repeating two phrases
      break;
  }

  return parts.join('\n');
}

/** 64-bit FNV-1a of the UTF-8 bytes, as 16 hex characters: the same in Node and every browser, with no async crypto. */
function fnv1a64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const b of bytes) {
    h ^= BigInt(b);
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0');
}

/**
 * The ready-made file of a text: its name depends only on the voice, the text the voice hears
 * (cleaned and with spaces squeezed, exactly like /api/tts) and AUDIO_FILES_VERSION.
 * A question that is edited gets a new name, so its old recording can never be played for it.
 */
export function audioFileName(clean: string, voice = DEFAULT_VOICE): string {
  const heard = clean.replace(/\s+/g, ' ').trim();
  return `${fnv1a64(`${AUDIO_FILES_VERSION}|${voice}|${heard}`)}.mp3`;
}
