// Build-time only: reads the question files and attaches the verses each question cites.
import type { Playable, Question } from './questions';
import { firstChapter, versesOf } from './refs';
import { getText } from './text';

export interface ChapterFile {
  ch: number;
  /** Where and when the chapter happens, shown above its questions when they are mixed with other chapters. */
  scene?: string;
  /** Set once a person has read and approved the chapter's questions. */
  reviewed: boolean;
  questions: Question[];
}

const files = import.meta.glob<ChapterFile>('../../content/*/intrebari/ch*.json', { import: 'default', eager: true });

/** Question files of a book, by chapter number. */
export function chapterFiles(book: string): Map<number, ChapterFile> {
  const out = new Map<number, ChapterFile>();
  for (const [path, file] of Object.entries(files)) {
    if (path.startsWith(`../../content/${book}/intrebari/`)) out.set(file.ch, file);
  }
  return out;
}

export function playable(book: string, q: Question, scene?: string): Playable {
  const text = getText(book)!;
  const pairCite = q.t === 'match' && q.refs ? q.refs.map((r) => versesOf(r, text)) : undefined;
  return { ...q, book, ch: firstChapter(q.ref), cite: versesOf(q.ref, text), ...(scene && { scene }), ...(pairCite && { pairCite }) };
}

/** Question counts per chapter, age group and type, for the practice screen. */
export function summary(book: string): Record<number, Record<string, Record<string, number>>> {
  const out: Record<number, Record<string, Record<string, number>>> = {};
  for (const [ch, file] of chapterFiles(book)) {
    const c = (out[ch] = {} as Record<string, Record<string, number>>);
    for (const q of file.questions) {
      c[q.age] ??= {};
      c[q.age][q.t] = (c[q.age][q.t] ?? 0) + 1;
    }
  }
  return out;
}

/** Number of chapter questions per age group in a book (what "all mastered" means). */
export function totals(book: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const file of chapterFiles(book).values()) for (const q of file.questions) out[q.age] = (out[q.age] ?? 0) + 1;
  return out;
}
