import { useEffect, useState } from 'preact/hooks';
import { bookHome } from '../lib/books';
import { localGet, localSet } from '../lib/store';
import Board from './Board';
import ChapterMenu, { type Summary } from './ChapterMenu';
import type { ExamInfo } from './ExamSheet';

export interface BookData {
  slug: string;
  name: string;
  titles: string[];
  summary: Summary;
  exams: ExamInfo[];
}

/** Book switch, chapter tiles and the leaderboard link. Switching books swaps the content in place, without loading a page. */
export default function BookPanel({ books, initial }: { books: BookData[]; initial: string }) {
  // the home address shows the book the player left off in
  const [slug, setSlug] = useState(() => {
    const saved = location.pathname === '/' ? localGet<string | null>('book', null) : null;
    return books.some((b) => b.slug === saved) ? saved! : initial;
  });
  const book = books.find((b) => b.slug === slug)!;

  useEffect(() => {
    localSet('book', slug);
    if (slug !== initial && location.pathname === '/') replaceUrl(bookHome(slug));
  }, [slug]);

  // browser back/forward between the two book addresses
  useEffect(() => {
    const onPop = () => {
      const found = books.find((b) => bookHome(b.slug) === location.pathname || `/${b.slug}` === location.pathname);
      if (found) setSlug(found.slug);
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  function pick(next: string) {
    if (next === slug) return;
    setSlug(next);
    replaceUrl(bookHome(next));
  }

  return (
    <>
      <section class="wrap hb-chap" aria-labelledby="chapters">
        <div class="card hb-chapters">
          <div class="book-switch" role="tablist" aria-label="Cartea">
            {books.map((b) => (
              <button type="button" role="tab" aria-selected={b.slug === slug} onClick={() => pick(b.slug)}>{b.name}</button>
            ))}
          </div>
          <h2 id="chapters">Ce capitol vrei să exersezi?</h2>
          <p class="small muted nowrap">{perLevel(book)} întrebări pentru fiecare grupă de vârstă</p>
          <ChapterMenu key={slug} book={slug} titles={book.titles} summary={book.summary} exams={book.exams} />
        </div>
      </section>

      <section class="wrap hb-block" aria-labelledby="lb-title">
        <div class="card lb">
          <Board key={slug} book={slug} />
        </div>
      </section>
    </>
  );
}

/** All the questions of a book, and those of one level (every level has the same number). */
const total = (b: BookData) => Object.values(b.summary).reduce((s, ch) => s + Object.values(ch['14-15'] ?? {}).reduce((a, n) => a + (n ?? 0), 0) * 5, 0);
const perLevel = (b: BookData) => total(b) / 5;

/** Changes the address without a page change, keeping the router's history state (the back button depends on it). */
function replaceUrl(url: string) {
  try { history.replaceState(history.state, '', url); } catch {}
}
