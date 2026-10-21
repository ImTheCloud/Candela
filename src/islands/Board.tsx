import { useEffect, useState } from 'preact/hooks';
import { collection, FieldPath, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { AGE_GROUPS, LEVEL_KEY, ageShort, type AgeGroup } from '../lib/age';
import { db } from '../lib/firebase';
import { level, setLevel } from '../lib/level';
import { user } from '../lib/session';

interface Row { key: string; name: string; score: number; at: number }

interface Props {
  book: string;
  bookName?: string;
  totals?: Record<string, number>;
}

/** Public board of a book: all levels together or one level. Each question counts once; ties go to whoever got there first. */
export default function Board({ book }: Props) {
  const [age, setAge] = useState<AgeGroup | 'all'>(level.value);
  // the level of the board and the level of the tests are one and the same choice
  useEffect(() => { setAge(level.value); }, [level.value]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setRows(null);
    setError(false);
    const field = age === 'all' ? 'score' : new FieldPath('lv', LEVEL_KEY[age]);
    getDocs(query(collection(db, 'boards', book, 'players'), orderBy(field, 'desc'), limit(100)))
      .then((snap) => setRows(
        snap.docs
          .map((d) => ({ key: d.id, name: d.get('name') as string, score: (d.get(field) as number) ?? 0, at: d.get('at')?.toMillis?.() ?? 0 }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score || a.at - b.at),
      ))
      .catch(() => setError(true));
  }, [book, age]);

  const mine = (key: string) => !!user.value && key.startsWith(`${user.value.uid}~`);

  return (
    <div class="board">
      <div class="age-tabs six" role="tablist" aria-label="Nivel">
        {AGE_GROUPS.map((g) => (
          <button type="button" role="tab" aria-selected={age === g.id} onClick={() => { setLevel(g.id); setAge(g.id); }}>{ageShort(g.id)}</button>
        ))}
        <button type="button" role="tab" aria-selected={age === 'all'} onClick={() => setAge('all')}>Toate</button>
      </div>
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
        <p class="lb-empty">Niciun jucător încă. Fii primul!</p>
      ) : (
        <>
          <ol class="lb-cards">
            {rows.map((r, i) => (
              <li class={`pd${i === 0 ? ' pd-1' : ''}${mine(r.key) ? ' me' : ''}`}>
                <span class="pd-rank">{i + 1}</span>
                <span class="pd-name">{r.name}</span>
                <span class="pd-score">{r.score}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
