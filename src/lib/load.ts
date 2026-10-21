import type { Playable } from './questions';

// Chapter questions are fetched once per page and kept.
interface ChapterData { questions: Playable[]; verses: string[] }
const cache = new Map<string, Promise<ChapterData>>();

function load(book: string, ch: number): Promise<ChapterData> {
  const key = `${book}/${ch}`;
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/data/${book}/${ch}.json`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<ChapterData>;
    });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

export const loadChapter = (book: string, ch: number): Promise<Playable[]> => load(book, ch).then((d) => d.questions);

/** The verses of a chapter, in order (verse 1 is index 0). */
export const loadVerses = (book: string, ch: number): Promise<string[]> => load(book, ch).then((d) => d.verses);

export async function loadChapters(book: string, chapters: number[]): Promise<Playable[]> {
  return (await Promise.all(chapters.map((c) => loadChapter(book, c)))).flat();
}

/** Chapter of a question, from its id "2sa.5.12-13.3". */
export function chapterOf(id: string): number {
  return Number(id.split('.')[1]);
}
