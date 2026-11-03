import { cleanSpeechText, currentPlayback, getActiveAudio } from './speech';

/** [start ms, duration ms, word] as said by the voice, from /api/tts?marks=1. */
type Mark = [number, number, string];

const marksCache = new Map<string, Promise<Mark[]>>();

function fetchMarks(text: string, voice = 'ro-RO-AlinaNeural'): Promise<Mark[]> {
  const clean = cleanSpeechText(text);
  if (!clean) return Promise.resolve([]);
  const key = `${voice}:${clean}`;
  let p = marksCache.get(key);
  if (!p) {
    p = fetch(`/api/tts?text=${encodeURIComponent(clean)}&voice=${encodeURIComponent(voice)}&marks=1`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => {
        marksCache.delete(key);
        return [];
      });
    marksCache.set(key, p);
  }
  return p;
}

const norm = (s: string) => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '');

/** Wraps every word of the verse in a span once (the verse number in <sup> stays as it is). */
function wordSpans(el: HTMLElement): HTMLElement[] {
  const done = el.querySelectorAll<HTMLElement>('span.w');
  if (done.length) return [...done];
  const texts: Text[] = [];
  el.childNodes.forEach((n) => { if (n.nodeType === Node.TEXT_NODE) texts.push(n as Text); });
  for (const t of texts) {
    const frag = document.createDocumentFragment();
    for (const part of (t.textContent ?? '').split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.append(part);
      } else {
        const span = document.createElement('span');
        span.className = 'w';
        span.textContent = part;
        frag.append(span);
      }
    }
    t.replaceWith(frag);
  }
  return [...el.querySelectorAll<HTMLElement>('span.w')];
}

/** For each mark, the span holding that word (null when it cannot be found). Hyphenated words share one span. */
function matchMarks(marks: Mark[], spans: HTMLElement[]): (HTMLElement | null)[] {
  const words = spans.map((s) => norm(s.textContent ?? ''));
  let k = 0;
  let at = 0;
  return marks.map(([, , word]) => {
    const w = norm(word);
    if (!w) return null;
    for (let j = k; j < Math.min(spans.length, k + 4); j++) {
      const from = j === k ? at : 0;
      const idx = words[j].indexOf(w, from);
      if (idx >= 0) {
        k = j;
        at = idx + w.length;
        return spans[j];
      }
    }
    return null;
  });
}

/**
 * Lights up the word being read in `el` while the voice reads `text`, following the audio time,
 * so it stays right at every speed and after a pause. Returns the way to stop it.
 */
export function followWords(el: HTMLElement, text: string): () => void {
  let stopped = false;
  let frame = 0;
  let lit: HTMLElement | null = null;
  // the shared audio element goes on to the next verse: only this text's playback is followed
  const gen = currentPlayback();

  const light = (span: HTMLElement | null) => {
    if (span === lit) return;
    lit?.classList.remove('is-word');
    span?.classList.add('is-word');
    lit = span;
  };

  fetchMarks(text).then((marks) => {
    if (stopped || !marks.length) return;
    const audio = getActiveAudio();
    if (!audio) return;
    const targets = matchMarks(marks, wordSpans(el));
    const tick = () => {
      if (stopped || currentPlayback() !== gen) return light(null);
      const t = audio.currentTime * 1000;
      let i = -1;
      for (let j = 0; j < marks.length && marks[j][0] <= t; j++) i = j;
      if (i >= 0 && targets[i]) light(targets[i]);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });

  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    light(null);
  };
}
