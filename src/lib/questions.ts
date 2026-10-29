import type { AgeGroup, Level } from './age';

/** The five kinds of exam questions, in the order of the paper exam. */
export type QType = 'tf' | 'one' | 'match' | 'fill' | 'multi';

interface Base {
  /** Stable id: never reused or renumbered, so progress survives edits. */
  id: string;
  /** Level of a chapter question, or age group of a real exam question. */
  age: Level | AgeGroup;
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
  | (Base & { t: 'match'; pairs: [string, string][]; /** verse of each pair, so a mock exam can mix pairs of several chapters */ refs?: string[] })
  | (Base & { t: 'fill'; a: string[] });

/** A question as sent to the browser, with the text of the verses it refers to. */
export type Playable = Question & {
  cite: [string, string][];
  book: string;
  /** 0 for a question made of several chapters (the mock exam's matching). */
  ch: number;
  scene?: string;
  /** match: the verses of each pair. */
  pairCite?: [string, string][][];
};

/** What a chapter has for every age group, and what the final exam (and the mock exam) has: 10 + 10 + one matching of 5 pairs + 3. */
export const SHAPE: Record<QType, number> = { tf: 10, one: 10, match: 1, fill: 0, multi: 3 };
export const PAIRS = 5;
/** Questions in a chapter test or an exam, for one age group. */
export const PER_TEST = Object.values(SHAPE).reduce((a, b) => a + b, 0);

export type Answer =
  | { t: 'tf'; v: boolean | null }
  | { t: 'one'; v: number | null }
  | { t: 'multi'; v: number[]; none: boolean }
  | { t: 'match'; v: (number | null)[] }
  | { t: 'fill'; v: string[] };

export const TYPES: { t: QType; label: string; short: string; hint: string }[] = [
  { t: 'tf', label: 'Adevărat sau fals', short: 'Adevărat sau fals', hint: '' },
  { t: 'one', label: 'Un singur răspuns corect', short: 'Alegere unică', hint: '' },
  { t: 'match', label: 'Asociază cele două coloane', short: 'Asociere', hint: '' },
  { t: 'fill', label: 'Completează versetul', short: 'Completare', hint: '' },
  { t: 'multi', label: 'Unul, mai multe sau niciunul', short: 'Alegere multiplă', hint: '' },
];

export function typeInfo(t: QType) {
  return TYPES.find((x) => x.t === t)!;
}

/** Every question is worth one point, as in the final exam; a matching gives its share per right pair. The score shows as a percentage. */
export function maxPoints(_q: Question): number {
  return 1;
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

/** Words that mean the same thing in the text: any of them is accepted for the others. */
const SAME_WORD: string[][] = [
  ['domnul', 'dumnezeu', 'doamne', 'dumnezeul'],
  ['domnului', 'dumnezeului'],
  ['imparat', 'imparatul', 'rege', 'regele'],
];

/** Numbers written as one word, so that "40" is as good as "patruzeci". */
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, unu: 1, un: 1, o: 1, doi: 2, doua: 2, trei: 3, patru: 4, cinci: 5, sase: 6, sapte: 7, opt: 8, noua: 9, zece: 10,
  unsprezece: 11, doisprezece: 12, douasprezece: 12, treisprezece: 13, paisprezece: 14, cincisprezece: 15, saisprezece: 16,
  saptesprezece: 17, optsprezece: 18, nouasprezece: 19, douazeci: 20, treizeci: 30, patruzeci: 40, cincizeci: 50, saizeci: 60,
  saptezeci: 70, optzeci: 80, nouazeci: 90, suta: 100, mie: 1000,
};

/** Edit distance with a swap of two neighbouring letters counting as one mistake. */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/**
 * A typed word is right when it is the expected word without accents or case, when it has a slip of the keys
 * (a letter missing, added, changed or swapped), or when it is another word for the same thing ("Domnul" for "Dumnezeu").
 */
export function sameWord(typed: string, expected: string): boolean {
  const t = normalizeWords(typed);
  const e = normalizeWords(expected);
  if (!t) return false;
  if (t === e) return true;
  // a number typed in digits
  if (/^\d+$/.test(t) && NUMBER_WORDS[e] === Number(t)) return true;
  if (SAME_WORD.some((g) => g.includes(t) && g.includes(e))) return true;
  // very short words are too easy to confuse with another one: no slip allowed
  if (e.length < 4 || t.length < 4) return false;
  return distance(t, e) <= (e.length >= 10 ? 2 : 1);
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
      return { points: (max * n) / parts.length, max, right: n === parts.length, parts };
    }
    case 'fill': {
      const parts = q.a.map((w, i) => a.t === 'fill' && sameWord(a.v[i] ?? '', w));
      const n = parts.filter(Boolean).length;
      return { points: (max * n) / parts.length, max, right: n === parts.length, parts };
    }
  }
}

/** Score out of 100: the points themselves on a full exam, a share of them on a shorter test. */
export function percent(points: number, max: number): number {
  return max ? Math.round((points / max) * 100) : 0;
}

/** Questions in the order of the exam paper (true/false, single answer, matching, multiple answer), mixed within each kind. */
export function examOrder<T extends { t: QType }>(list: T[]): T[] {
  const rank = (t: QType) => TYPES.findIndex((x) => x.t === t);
  return shuffle(list).sort((a, b) => rank(a.t) - rank(b.t));
}

export function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
