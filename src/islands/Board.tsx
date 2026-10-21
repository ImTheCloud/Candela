import { useEffect, useState } from 'preact/hooks';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { AGE_GROUPS, ageShort, type AgeGroup } from '../lib/age';
import { db } from '../lib/firebase';
import { level } from '../lib/level';
import { user } from '../lib/session';

interface Row { key: string; name: string; score: number }

/** Public board of a book, one list per level: each question counts once, ties go to whoever got there first. */
export default function Board({ book }: { book: string; totals?: Record<string, number> }) {
  const [age, setAge] = useState<AgeGroup>(level.value);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setRows(null);
    setError(false);
    const q = query(collection(db, 'boards', book, 'players'), where('age', '==', age), orderBy('score', 'desc'), orderBy('at', 'asc'), limit(100));
    getDocs(q)
      .then((snap) => setRows(snap.docs.map((d) => ({ key: d.id, name: d.get('name'), score: d.get('score') }))))
      .catch(() => setError(true));
  }, [book, age]);

  const mine = (key: string) => !!user.value && key.startsWith(`${user.value.uid}~`);

  return (
    <div class="board">
      <div class="age-tabs" role="tablist" aria-label="Nivel">
        {AGE_GROUPS.map((g) => (
          <button type="button" role="tab" aria-selected={age === g.id} onClick={() => setAge(g.id)}>{ageShort(g.id)}</button>
        ))}
      </div>
      {user.value === null && (
        <div class="card picker guest">
          <p class="small">Joci fără cont, așa că nu apari în clasament. Progresul rămâne doar pe acest telefon.</p>
          <a class="btn btn-primary btn-sm" href="/cont/inregistrare">Creează un cont</a>
        </div>
      )}
      <p class="small muted">Fiecare întrebare contează o singură dată, prima dată când răspunzi corect.</p>
      {error ? (
        <p class="notice notice-bad">Clasamentul nu s-a putut încărca. Verifică conexiunea la internet.</p>
      ) : rows === null ? (
        <div class="card skeleton" />
      ) : rows.length === 0 ? (
        <p class="card empty muted">Nimeni nu este încă în clasament la acest nivel.</p>
      ) : (
        <ol class="card rows">
          {rows.map((r, i) => (
            <li class={mine(r.key) ? 'me' : ''}>
              <span class="rank">{i + 1}</span>
              <span class="who">{r.name}</span>
              <span class="pts">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
