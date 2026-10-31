import { useEffect, useState } from 'preact/hooks';
import { collection, FieldPath, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { LEVEL_KEY, type Level } from '../lib/age';
import { boardChangedAt } from '../lib/board';
import { db } from '../lib/firebase';
import { scoreView } from '../lib/level';
import { user } from '../lib/session';
import LevelPicker from './LevelPicker';

interface Row { key: string; name: string; score: number; at: number }

// Only players with at least one point are listed.
// Boards fetched in the last minutes, kept across pages: coming back home costs no reads (the free plan counts every document read).
const FRESH = 5 * 60 * 1000;
const SIZE = 50;
const cache = new Map<string, { rows: Row[]; at: number }>();
const cached = (key: string) => {
  const c = cache.get(key);
  return c && Date.now() - c.at < FRESH && c.at > boardChangedAt ? c.rows : null;
};

async function fetchBoard(book: string, a: Level | 'all'): Promise<Row[]> {
  const key = `${book}:${a}`;
  const field = a === 'all' ? 'score' : new FieldPath('lv', LEVEL_KEY[a]);
  const snap = await getDocs(query(collection(db, 'boards', book, 'players'), where(field, '>', 0), orderBy(field, 'desc'), limit(SIZE)));
  const list = snap.docs
    .map((d) => ({
      key: d.id,
      name: d.get('name') as string,
      score: (d.get(field) as number) ?? 0,
      at: d.get('at')?.toMillis?.() ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.at - b.at);

  cache.set(key, { rows: list, at: Date.now() });
  return list;
}

interface Props {
  book: string;
  bookName?: string;
  totals?: Record<string, number>;
}

/** Public board of a book: all levels together or one level. Each question counts once; ties go to whoever got there first. */
export default function Board({ book }: Props) {
  // the tabs also pick which scores the chapter tiles show; they do not change the level of the tests
  const [age, setAgeState] = useState<Level | 'all'>(scoreView.value);
  const [rows, setRows] = useState<Row[] | null>(() => cached(`${book}:${scoreView.value}`));
  const [error, setError] = useState(false);

  const setAge = (next: Level | 'all') => {
    if (next === age) return;
    scoreView.value = next;
    setAgeState(next);
    // instant switch when this board was already fetched since the page opened
    const rows = cached(`${book}:${next}`);
    if (rows) {
      setRows(rows);
      setError(false);
    } else {
      setRows(null);
    }
  };

  useEffect(() => {
    let active = true;

    // only the tab on screen is read, and only when it is not fresh
    if (cached(`${book}:${age}`)) return;
    fetchBoard(book, age)
      .then((list) => {
        if (active) {
          setRows(list);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => { active = false; };
  }, [book, age]);

  const mine = (key: string) => !!user.value && key.startsWith(`${user.value.uid}~`);

  return (
    <div class="board">
      <div class="lb-head">
        <div class="lb-title">
          <h2 id="lb-title">Clasament</h2>
          <p class="lb-count small muted" style={rows === null || error ? { visibility: 'hidden' } : undefined}>
            {rows ? `${rows.length} ${rows.length === 1 ? 'jucător' : 'jucători'}` : '\u00a0'}
          </p>
        </div>
      </div>

      <LevelPicker<Level | 'all'>
        label="Nivelul clasamentului"
        value={age}
        onChange={setAge}
        includeAll
      />

      {user.value === null && (
        <div class="lb-guest">
          <p class="small">Nu ești în cont. Intră sau creează un cont ca să joci și să apari în clasament.</p>
          <a class="btn btn-primary btn-block" href="/cont/inregistrare">Creează un cont</a>
        </div>
      )}
      {error ? (
        <p class="notice notice-bad">Clasamentul nu s-a putut încărca. Verifică conexiunea la internet.</p>
      ) : rows === null ? (
        <ol class="lb-cards" aria-busy="true" aria-label="Se încarcă clasamentul">
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i} class="pd pd-skel" aria-hidden="true">
              <span class="pd-rank" />
              <span class="pd-name"><span class="skel-bar name" /></span>
              <span class="pd-score"><span class="skel-bar score" /></span>
            </li>
          ))}
        </ol>
      ) : rows.length === 0 ? (
        <p class="lb-empty" key={age}>Niciun jucător încă. Fii primul!</p>
      ) : (
        <ol class="lb-cards" key={age}>
          {rows.map((r, i) => (
            <li key={r.key} class={`pd${i < 3 ? ` pd-${i + 1}` : ''}`}>
              <span class="pd-rank">{i + 1}</span>
              <span class="pd-name"><span class="pd-text">{r.name}</span>{mine(r.key) && <span class="pd-me">Eu</span>}</span>
              <span class="pd-score">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
