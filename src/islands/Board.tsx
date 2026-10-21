import { useEffect, useRef, useState } from 'preact/hooks';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { AGE_GROUPS, ageGroup, type AgeGroup } from '../lib/age';
import { db } from '../lib/firebase';
import { player } from '../lib/players';
import { user } from '../lib/session';

interface Row { key: string; name: string; score: number }

/** Public board of a book, one list per age group: each question counts once, ties go to whoever got there first. */
export default function Board({ book, totals }: { book: string; totals: Record<string, number> }) {
  const p = player.value;
  const [age, setAge] = useState<AgeGroup>(p.birthYear ? ageGroup(p.birthYear) : '12-13');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const tabs = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tabs.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [age]);

  useEffect(() => {
    if (p.birthYear) setAge(ageGroup(p.birthYear));
  }, [p.key, p.birthYear]);

  useEffect(() => {
    setRows(null);
    setError(false);
    const q = query(collection(db, 'boards', book, 'players'), where('age', '==', age), orderBy('score', 'desc'), orderBy('at', 'asc'), limit(100));
    getDocs(q)
      .then((snap) => setRows(snap.docs.map((d) => ({ key: d.id, name: d.get('name'), score: d.get('score') }))))
      .catch(() => setError(true));
  }, [book, age]);

  const mine = (key: string) => !!user.value && key.startsWith(`${user.value.uid}~`);
  const total = totals[age] ?? 0;

  return (
    <div class="board">
      <div class="age-tabs" ref={tabs} role="tablist" aria-label="Categoria de vârstă">
        {AGE_GROUPS.map((g) => (
          <button type="button" role="tab" aria-selected={age === g.id} class="chip" onClick={() => setAge(g.id)}>
            <span class="chip-name">{g.label}</span>
          </button>
        ))}
      </div>
      {user.value === null && (
        <div class="card picker guest">
          <p class="small">Joci fără cont, așa că nu apari în clasament. Progresul rămâne doar pe acest telefon.</p>
          <a class="btn btn-primary btn-sm" href="/cont/inregistrare">Creează un cont</a>
        </div>
      )}
      <p class="small muted">Fiecare întrebare contează o singură dată, prima dată când răspunzi corect.{total ? ` Sunt ${total} de întrebări pentru această vârstă.` : ''}</p>
      {error ? (
        <p class="notice notice-bad">Clasamentul nu s-a putut încărca. Verifică conexiunea la internet.</p>
      ) : rows === null ? (
        <div class="card skeleton" />
      ) : rows.length === 0 ? (
        <p class="card empty muted">Nimeni nu este încă în clasament la această vârstă.</p>
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
