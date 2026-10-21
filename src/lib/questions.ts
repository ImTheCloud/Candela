import type { AgeGroup } from './age';

/** The five kinds of exam questions, in the order of the paper exam (parts I to V). */
export type QType = 'tf' | 'one' | 'match' | 'fill' | 'multi';

interface Base {
  /** Stable id: never reused or renumbered, so progress survives edits. */
  id: string;
  age: AgeGroup;
  ref: string;
  q: string;
  /** Who speaks or what happens, shown above a verse to complete. */
  ctx?: string;
  /** Short note shown after answering, like the "Atenție:" lines of the corrected exams. */
  explain?: string;
}
export type Question =
  | (Base & { t: 'tf'; a: boolean })
  | (Base & { t: 'one'; opts: string[]; a: number })
  | (Base & { t: 'multi'; opts: string[]; a: number[] })
  | (Base & { t: 'match'; pairs: [string, string][] })
  | (Base & { t: 'fill'; a: string[] });

/** A question as sent to the browser, with the text of the verses it refers to. */
export type Playable = Question & { cite: [string, string][]; book: string; ch: number };

export type Answer =
  | { t: 'tf'; v: boolean | null }
  | { t: 'one'; v: number | null }
  | { t: 'multi'; v: number[]; none: boolean }
  | { t: 'match'; v: (number | null)[] }
  | { t: 'fill'; v: string[] };

export const TYPES: { t: QType; part: string; label: string; short: string; hint: string }[] = [
  { t: 'tf', part: 'I', label: 'Adevărat sau fals', short: 'Adevărat sau fals', hint: '' },
  { t: 'one', part: 'II', label: 'Un singur răspuns corect', short: 'Un răspuns', hint: '' },
  { t: 'match', part: 'III', label: 'Asociază cele două coloane', short: 'Asociere', hint: '' },
  { t: 'fill', part: 'IV', label: 'Completează versetul', short: 'Completare', hint: '' },
  { t: 'multi', part: 'V', label: 'Unul, mai multe sau niciunul', short: 'Mai multe răspunsuri', hint: '' },
];

export function typeInfo(t: QType) {
  return TYPES.find((x) => x.t === t)!;
}

/**
 * Points per question: 3, 4, 2 per pair, 5, 6. A full exam (5 + 5 + one matching of 5 pairs + 5 + 5)
 * is worth exactly 100, so the score needs no conversion.
 */
export function maxPoints(q: Question): number {
  switch (q.t) {
    case 'tf': return 3;
    case 'one': return 4;
    case 'match': return q.pairs.length * 2;
    case 'fill': return 5;
    case 'multi': return 6;
  }
}

export function emptyAnswer(q: Question): Answer {
  switch (q.t) {
    case 'tf': return { t: 'tf', v: null };
    case 'one': return { t: 'one', v: null };
    case 'multi': return { t: 'multi', v: [], none: false };
    case 'match': return { t: 'match', v: q.pairs.map(() => null) };
    case 'fill': return { t: 'fill', v: q.a.map(() => '') };
  }
}

export function isAnswered(a: Answer): boolean {
  switch (a.t) {
    case 'tf':
    case 'one': return a.v !== null;
    case 'multi': return a.none || a.v.length > 0;
    case 'match': return a.v.every((x) => x !== null);
    case 'fill': return a.v.every((x) => x.trim() !== '');
  }
}

/** Typed words are compared without case, diacritics or punctuation. */
export function normalizeWords(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[„"“”'‘’«»,.;:!?()\[\]–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface Grade {
  points: number;
  max: number;
  /** Fully right: the question counts as mastered. */
  right: boolean;
  /** Per blank (fill) or per pair (match). */
  parts?: boolean[];
}

export function grade(q: Question, a: Answer): Grade {
  const max = maxPoints(q);
  switch (q.t) {
    case 'tf': {
      const right = a.t === 'tf' && a.v === q.a;
      return { points: right ? max : 0, max, right };
    }
    case 'one': {
      const right = a.t === 'one' && a.v === q.a;
      return { points: right ? max : 0, max, right };
    }
    case 'multi': {
      if (a.t !== 'multi') return { points: 0, max, right: false };
      const picked = a.none ? [] : [...a.v].sort();
      const right = picked.length === q.a.length && [...q.a].sort().every((x, i) => x === picked[i]);
      return { points: right ? max : 0, max, right };
    }
    case 'match': {
      const parts = q.pairs.map((_, i) => a.t === 'match' && a.v[i] === i);
      const n = parts.filter(Boolean).length;
      return { points: n, max, right: n === parts.length, parts };
    }
    case 'fill': {
      const parts = q.a.map((w, i) => a.t === 'fill' && normalizeWords(a.v[i] ?? '') === normalizeWords(w));
      const n = parts.filter(Boolean).length;
      return { points: Math.round((max * n * 2) / parts.length) / 2, max, right: n === parts.length, parts };
    }
  }
}

/** Score out of 100: the points themselves on a full exam, a share of them on a shorter test. */
export function percent(points: number, max: number): number {
  return max ? Math.round((points / max) * 100) : 0;
}

export function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
