// Build-time only: reads the question files and attaches the verses each question cites.
import type { AgeGroup } from './age';
import type { Playable, Question } from './questions';
import { firstChapter, versesOf } from './refs';
import { getText } from './text';

export interface ChapterFile {
  ch: number;
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

export function playable(book: string, q: Question): Playable {
  const text = getText(book)!;
  return { ...q, book, ch: firstChapter(q.ref), cite: versesOf(q.ref, text) };
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

export interface ExamFile {
  id: string;
  title: string;
  age: string;
  year: number;
  questions: Question[];
}

const examFiles = import.meta.glob<ExamFile>('../../content/*/examene/*.json', { import: 'default', eager: true });

const AGE_ORDER = ['sub12', '12-13', '14-15', '16-17', '18+'];

/** Past exams of a book, newest year first, then by age group. */
export function exams(book: string): ExamFile[] {
  return Object.entries(examFiles)
    .filter(([path]) => path.startsWith(`../../content/${book}/examene/`))
    .map(([, e]) => e)
    .sort((a, b) => b.year - a.year || AGE_ORDER.indexOf(a.age) - AGE_ORDER.indexOf(b.age));
}

/** When the real exams took place (they are added to the site after they happen). */
export const EXAM_DATES: Record<string, Record<string, string>> = {
  '1-samuel': { 'sub12': 'sâmbătă, 24 octombrie 2026', '12-13': 'luni, 19 octombrie 2026', '14-15': 'luni, 19 octombrie 2026', '16-17': 'luni, 19 octombrie 2026', '18+': 'luni, 19 octombrie 2026' },
};

/** The real exams of a book as the exam sheet lists them. */
export function examList(book: string) {
  return exams(book).map((e) => ({ id: e.id, age: e.age as AgeGroup, title: e.title, year: e.year, date: EXAM_DATES[book]?.[e.age] }));
}

/** Number of chapter questions per age group in a book (what "all mastered" means). */
export function totals(book: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const file of chapterFiles(book).values()) for (const q of file.questions) out[q.age] = (out[q.age] ?? 0) + 1;
  return out;
}
