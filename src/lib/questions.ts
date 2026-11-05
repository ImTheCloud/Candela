import type { Level } from './age';

/** The four kinds of questions, in the order of the paper exam. */
export type QType = 'tf' | 'one' | 'match' | 'multi';

interface Base {
  /** Stable id: never reused or renumbered, so progress survives edits. */
  id: string;
  /** Level of the question. */
  age: Level;
  ref: string;
  q: string;
  /** Short note shown after answering, like the "Atenție:" lines of the corrected exams. */
  explain?: string;
}
export type Question =
  | (Base & { t: 'tf'; a: boolean })
  | (Base & { t: 'one'; opts: string[]; a: number })
  | (Base & { t: 'multi'; opts: string[]; a: number[] })
  | (Base & { t: 'match'; pairs: [string, string][]; /** verse of each pair, so a mock exam can mix pairs of several chapters */ refs?: string[] });

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
export const SHAPE: Record<QType, number> = { tf: 10, one: 10, match: 1, multi: 3 };
export const PAIRS = 5;
/** Questions in a chapter test or an exam, for one age group. */
export const PER_TEST = Object.values(SHAPE).reduce((a, b) => a + b, 0);

export type Answer =
  | { t: 'tf'; v: boolean | null }
  | { t: 'one'; v: number | null }
  | { t: 'multi'; v: number[]; none: boolean }
  | { t: 'match'; v: (number | null)[] };

export const TYPES: { t: QType; label: string; short: string; hint: string }[] = [
  { t: 'tf', label: 'Adevărat sau fals', short: 'Adevărat sau fals', hint: '' },
  { t: 'one', label: 'Un singur răspuns corect', short: 'Alegere unică', hint: '' },
  { t: 'match', label: 'Asociază cele două coloane', short: 'Asociere', hint: '' },
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
  }
}

export function isAnswered(a: Answer): boolean {
  switch (a.t) {
    case 'tf':
    case 'one': return a.v !== null;
    case 'multi': return a.none || a.v.length > 0;
    case 'match': return a.v.every((x) => x !== null);
  }
}

export interface Grade {
  points: number;
  max: number;
  /** Fully right: the question counts as mastered. */
  right: boolean;
  /** Per pair (match). */
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
