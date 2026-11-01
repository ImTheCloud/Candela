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
  const [selectedBook, setSelectedBook] = useState(books[0]?.slug ?? '1-samuel');
  const [search, setSearch] = useState('');

  const current = books.find((b) => b.slug === selectedBook) ?? books[0]!;
  const term = search.trim().toLowerCase();

  const filtered = term
    ? current.chapters.filter(
        (c) =>
          String(c.ch).includes(term) ||
          c.title.toLowerCase().includes(term) ||
          `capitolul ${c.ch}`.includes(term)
      )
    : current.chapters;

  const totalAll = books.reduce((sum, b) => sum + b.totalQuestions, 0);

  return (
    <div class="stack" style={{ gap: '18px' }}>
      <div class="adm-hub-head">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <h1 style={{ margin: 0 }}>Întrebări și răspunsuri</h1>
          <a class="btn btn-ghost btn-sm" href="/admin">← Administrare</a>
        </div>
        <p class="muted" style={{ margin: '6px 0 0' }}>
          Consultă toate întrebările și răspunsurile pentru fiecare capitol și nivel. Datele sunt sincronizate direct din fișierele JSON ale întrebărilor ({totalAll} întrebări în total).
        </p>
      </div>

      {/* Book tabs */}
      <div class="adm-tabs" role="tablist">
        {books.map((b) => {
          const active = b.slug === current.slug;
          return (
            <button
              key={b.slug}
              type="button"
              role="tab"
              aria-selected={active}
              class={`adm-tab${active ? ' is-active' : ''}`}
              onClick={() => { setSelectedBook(b.slug); setSearch(''); }}
            >
              <strong>{b.name}</strong>
              <span class="small">{b.chaptersCount} capitole • {b.totalQuestions} întrebări</span>
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div class="field" style={{ margin: 0 }}>
        <input
          class="input"
          type="search"
          placeholder={`Caută în capitolele din ${current.name} (ex: 3 sau Goliat)...`}
          aria-label="Caută capitol"
          value={search}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />
      </div>

      {/* Chapters list */}
      <div class="adm-chapters-list">
        {filtered.map((c) => (
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
        {filtered.length === 0 && (
          <p class="card empty muted">Niciun capitol nu corespunde căutării.</p>
        )}
      </div>
    </div>
  );
}

