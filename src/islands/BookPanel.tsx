import { useEffect, useState } from 'preact/hooks';
import { bookHome } from '../lib/books';
import { localGet, localSet } from '../lib/store';
import Board from './Board';
import ChapterMenu, { type Summary } from './ChapterMenu';

export interface BookData {
  slug: string;
  name: string;
  titles: string[];
  summary: Summary;
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
          <ChapterMenu key={slug} book={slug} titles={book.titles} summary={book.summary} examsHref={`/${slug}/examene`} />
        </div>
      </section>

      <section class="wrap hb-block" aria-labelledby="lb-title">
        <div class="card lb">
          <h2 id="lb-title">Clasament</h2>
          <Board key={slug} book={slug} bookName={book.name} titles={book.titles} />
        </div>
      </section>
    </>
  );
}

/** Changes the address without a page change, keeping the router's history state (the back button depends on it). */
function replaceUrl(url: string) {
  try { history.replaceState(history.state, '', url); } catch {}
}
