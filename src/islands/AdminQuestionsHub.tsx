import { useState } from 'preact/hooks';
import { profile, profileLoaded, user } from '../lib/session';
import Loader from './Loader';

export interface ChapterSummary {
  ch: number;
  title: string;
  count: number;
  reviewed: boolean;
}

export interface BookSummary {
  slug: string;
  name: string;
  chaptersCount: number;
  totalQuestions: number;
  chapters: ChapterSummary[];
}

interface Props {
  books: BookSummary[];
}

export default function AdminQuestionsHub({ books }: Props) {
  const u = user.value;
  if (u === undefined || (u && !profileLoaded.value && !profile.value)) return <Loader />;
  if (!u) {
    return (
      <div class="card stack" style={{ padding: '24px' }}>
        <p class="notice">Intră în cont ca să vezi întrebările și răspunsurile.</p>
        <a class="btn btn-primary" href="/cont">Intră în cont</a>
      </div>
    );
  }
  if (!profile.value?.admin) {
    return (
      <div class="card stack" style={{ padding: '24px' }}>
        <p class="notice notice-bad">Această pagină este rezervată administratorilor.</p>
      </div>
    );
  }

  return <HubContent books={books} />;
}

function HubContent({ books }: { books: BookSummary[] }) {
  const [selectedBook, setSelectedBook] = useState(
    books.some((b) => b.slug === '2-samuel') ? '2-samuel' : (books[0]?.slug ?? '1-samuel')
  );

  const current = books.find((b) => b.slug === selectedBook) ?? books[0]!;
  const totalAll = books.reduce((sum, b) => sum + b.totalQuestions, 0);

  return (
    <div class="stack" style={{ gap: '16px' }}>
      <div class="adm-hub-head">
        <h1 style={{ margin: 0 }}>Întrebări și răspunsuri</h1>
        <p class="muted" style={{ margin: '6px 0 0' }}>
          Consultă toate întrebările și răspunsurile pentru fiecare capitol și nivel ({totalAll} întrebări în total).
        </p>
      </div>

      {/* Book selector: simple 2-button switch like home page */}
      <div class="book-switch" role="tablist" aria-label="Alege cartea">
        {books.map((b) => (
          <button
            key={b.slug}
            type="button"
            role="tab"
            aria-selected={b.slug === current.slug}
            onClick={() => setSelectedBook(b.slug)}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Chapters list */}
      <div class="adm-chapters-list">
        {current.chapters.map((c) => (
          <a
            key={c.ch}
            class="card adm-ch-card"
            href={`/${current.slug}/verificare/${c.ch}`}
          >
            <div class="adm-ch-main">
              <span class="adm-ch-num">{c.ch}</span>
              <div class="adm-ch-info">
                <strong>{c.title}</strong>
                <span class="small muted">Capitolul {c.ch} • {c.count} întrebări</span>
              </div>
            </div>
            <div class="adm-ch-meta">
              <span class="btn btn-ghost btn-sm">Deschide →</span>
            </div>
          </a>
        ))}
        {current.chapters.length === 0 && (
          <p class="card empty muted">Nu există capitole disponibile pentru această carte.</p>
        )}
      </div>
    </div>
  );
}

