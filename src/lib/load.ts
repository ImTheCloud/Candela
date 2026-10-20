import type { Playable } from './questions';

// Chapter questions are fetched once per page and kept (they are also cached offline by the service worker).
const cache = new Map<string, Promise<Playable[]>>();

export function loadChapter(book: string, ch: number): Promise<Playable[]> {
  const key = `${book}/${ch}`;
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/data/${book}/${ch}.json`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json().then((d: { questions: Playable[] }) => d.questions);
    });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

export async function loadChapters(book: string, chapters: number[]): Promise<Playable[]> {
  return (await Promise.all(chapters.map((c) => loadChapter(book, c)))).flat();
}

/** Chapter of a question, from its id "2sa.5.12-13.3". */
export function chapterOf(id: string): number {
  return Number(id.split('.')[1]);
}
