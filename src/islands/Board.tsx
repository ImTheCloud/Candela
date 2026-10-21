import { useEffect, useState } from 'preact/hooks';
import { collection, FieldPath, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { AGE_GROUPS, LEVEL_KEY, ageShort, type AgeGroup } from '../lib/age';
import { db } from '../lib/firebase';
import { level } from '../lib/level';
import { user } from '../lib/session';
import Avatar from './Avatar';

interface Row { key: string; name: string; score: number }

interface Props {
  book: string;
  bookName?: string;
  /** Chapter titles of the book, for the chapter filter. */
  titles?: string[];
  totals?: Record<string, number>;
}

/**
 * Public boards. Of the whole app, or of a book: all levels or one, all chapters or one.
 * Each question counts once; ties go to whoever got there first.
 */
export default function Board({ book, bookName, titles = [] }: Props) {
  const [scope, setScope] = useState<'book' | 'app'>('book');
  const [age, setAge] = useState<AgeGroup | 'all'>(level.value);
  const [chapter, setChapter] = useState(0);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);

  // which field of the player's entry the list is ordered by
  const field: string | FieldPath =
    scope === 'app' ? 'score'
    : chapter && age !== 'all' ? new FieldPath('ch', String(chapter), LEVEL_KEY[age])
    : chapter ? new FieldPath('ct', String(chapter))
    : age !== 'all' ? new FieldPath('lv', LEVEL_KEY[age])
    : 'score';

  useEffect(() => {
    setRows(null);
    setError(false);
    const coll = scope === 'app' ? collection(db, 'boards', 'all', 'players') : collection(db, 'boards', book, 'players');
    getDocs(query(coll, orderBy(field, 'desc'), limit(100)))
      .then((snap) => setRows(
        snap.docs
          .map((d) => ({ key: d.id, name: d.get('name') as string, score: (d.get(field) as number) ?? 0, at: d.get('at')?.toMillis?.() ?? 0 }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score || a.at - b.at),
      ))
      .catch(() => setError(true));
  }, [book, scope, age, chapter]);

  const mine = (key: string) => !!user.value && key.startsWith(`${user.value.uid}~`);
  const top = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  // podium order: second, first, third
  const podium = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);

  return (
    <div class="board">
      <div class="book-switch" role="tablist" aria-label="Clasament">
        <button type="button" role="tab" aria-selected={scope === 'book'} onClick={() => setScope('book')}>{bookName ?? 'Cartea'}</button>
        <button type="button" role="tab" aria-selected={scope === 'app'} onClick={() => setScope('app')}>Toate cărțile</button>
      </div>
      {scope === 'book' && (
        <>
          <div class="age-tabs six" role="tablist" aria-label="Nivel">
            <button type="button" role="tab" aria-selected={age === 'all'} onClick={() => setAge('all')}>Toate</button>
            {AGE_GROUPS.map((g) => (
              <button type="button" role="tab" aria-selected={age === g.id} onClick={() => setAge(g.id)}>{ageShort(g.id)}</button>
            ))}
          </div>
          {titles.length > 0 && (
            <select class="input lb-select" aria-label="Capitol" value={chapter} onChange={(e) => setChapter(Number(e.currentTarget.value))}>
              <option value={0}>Toate capitolele</option>
              {titles.map((t, k) => <option value={k + 1}>Capitolul {k + 1} · {t}</option>)}
            </select>
          )}
        </>
      )}
      {user.value === null && (
        <div class="lb-guest">
          <p class="small">Joci fără cont, așa că nu apari în clasament. Progresul rămâne doar pe acest telefon.</p>
          <a class="btn btn-primary btn-sm" href="/cont/inregistrare">Creează un cont</a>
        </div>
      )}
      {error ? (
        <p class="notice notice-bad">Clasamentul nu s-a putut încărca. Verifică conexiunea la internet.</p>
      ) : rows === null ? (
        <div class="lb-skeleton" aria-hidden="true"><span /><span /><span /></div>
      ) : rows.length === 0 ? (
        <p class="lb-empty">Nimeni nu este încă în acest clasament. Fii primul!</p>
      ) : (
        <>
          <ol class={`podium n${top.length}`}>
            {podium.map((i) => (
              <li class={`pd pd-${i + 1}${mine(top[i].key) ? ' me' : ''}`}>
                <span class="pd-rank">{i + 1}</span>
                <Avatar name={top[i].name} size={i === 0 ? 52 : 44} />
                <span class="pd-name">{top[i].name}</span>
                <span class="pd-score">{top[i].score}</span>
              </li>
            ))}
          </ol>
          {rest.length > 0 && (
            <ol class="lb-rows" start={4}>
              {rest.map((r, k) => (
                <li class={mine(r.key) ? 'me' : ''}>
                  <span class="rank">{k + 4}</span>
                  <Avatar name={r.name} size={30} />
                  <span class="who">{r.name}</span>
                  <span class="pts">{r.score}</span>
                </li>
              ))}
            </ol>
          )}
          <p class="small muted lb-note">Punctele sunt întrebările știute: fiecare contează o singură dată.</p>
        </>
      )}
    </div>
  );
}
