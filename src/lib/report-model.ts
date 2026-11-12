import type { Timestamp } from 'firebase/firestore';
import type { Question } from './questions';

export const REASONS = [
  { id: 'answer', label: 'Răspunsul corect nu este bun' },
  { id: 'text', label: 'Întrebarea nu se potrivește cu textul biblic' },
  { id: 'unclear', label: 'Întrebarea nu este clară' },
  { id: 'hard', label: 'Prea grea pentru acest nivel' },
  { id: 'typo', label: 'Greșeală de scriere' },
  { id: 'other', label: 'Altceva' },
] as const;
export type Reason = (typeof REASONS)[number]['id'];
export type Decision = 'accepted' | 'rejected';
export type ReportStatus = 'pending' | Decision | 'legacy';

export const REPORT_THANKS = 'Îți mulțumim că ți-ai făcut timp să ne semnalezi această întrebare. Ajutorul tău contează pentru noi!';

export interface Report {
  id: string;
  uid: string;
  qid: string;
  book: string;
  ch: number;
  ref: string;
  q: string;
  reason: Reason;
  note: string;
  by: string;
  done: boolean;
  at: Timestamp | null;
  status?: 'pending' | Decision;
  originalQuestion?: string;
  correctedQuestion?: string;
  correctedText?: string;
  response?: string;
  decidedAt?: Timestamp | null;
  decidedBy?: string;
  responseReadAt?: Timestamp | null;
}

/** Old resolved reports stay in the history without inventing a decision. */
export const reportStatus = (r: Report): ReportStatus => r.status ?? (r.done ? 'legacy' : 'pending');
export const isUnread = (r: Report): boolean =>
  (reportStatus(r) === 'accepted' || reportStatus(r) === 'rejected') && !r.responseReadAt;

/** Compare content, including answers and level, but exclude runtime quiz data. */
export function questionSnapshot(q: Question): string {
  return JSON.stringify({
    id: q.id, t: q.t, age: q.age, ref: q.ref, q: q.q, explain: q.explain ?? '',
    ...(q.t === 'match' ? { pairs: q.pairs, refs: q.refs ?? [] } : { a: q.a }),
    ...((q.t === 'one' || q.t === 'multi') ? { opts: q.opts } : {}),
  });
}

export function hasCorrection(r: Report, q: Question): boolean {
  return r.qid === q.id && (r.originalQuestion
    ? r.originalQuestion !== questionSnapshot(q)
    : r.q !== q.q || r.ref !== q.ref);
}

/** Retain a readable record even if the question changes again later. */
export function questionSummary(q: Question): string {
  const lines = [q.q];
  if (q.t === 'tf') lines.push(`Răspuns: ${q.a ? 'Adevărat' : 'Fals'}`);
  if (q.t === 'one' || q.t === 'multi') {
    lines.push(...q.opts.map((o, i) => `${String.fromCharCode(97 + i)}) ${o}`));
    const answers = q.t === 'one' ? [q.a] : q.a;
    lines.push(`Răspuns: ${answers.length ? answers.map((i) => String.fromCharCode(97 + i)).join(', ') : 'Niciun răspuns corect'}`);
  }
  if (q.t === 'match') lines.push(...q.pairs.map(([a, b]) => `${a} → ${b}`));
  lines.push(`Referință: ${q.ref}`);
  if (q.explain) lines.push(q.explain);
  return lines.join('\n');
}
