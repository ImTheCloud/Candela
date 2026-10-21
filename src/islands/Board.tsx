import { useEffect, useState } from 'preact/hooks';
import { collection, FieldPath, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { AGE_GROUPS, LEVEL_KEY, ageShort, type AgeGroup } from '../lib/age';
import { db } from '../lib/firebase';
import { player, setHidden } from '../lib/players';
import { progress } from '../lib/progress';
import { profile, rememberedAccount, user } from '../lib/session';

interface Row { key: string; name: string; score: number; at: number }

// what each list showed last time: shown at once when the tab is opened again, then refreshed without any change on screen
const cache = new Map<string, Row[]>();

interface Props {
  book: string;
  bookName?: string;
  totals?: Record<string, number>;
}

/** Public board of a book: all levels together or one level. Each question counts once; ties go to whoever got there first. */
export default function Board({ book }: Props) {
  // always opens on "Toate"; this choice is only for the board and does not change the level of the tests
  const [age, setAge] = useState<AgeGroup | 'all'>('all');
  const [rows, setRows] = useState<Row[] | null>(() => cache.get(`${book}:all`) ?? null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const key = `${book}:${age}`;
    setRows(cache.get(key) ?? null);
    setError(false);
    const field = age === 'all' ? 'score' : new FieldPath('lv', LEVEL_KEY[age]);
    getDocs(query(collection(db, 'boards', book, 'players'), orderBy(field, 'desc'), limit(100)))
      .then((snap) => {
        const list = snap.docs
          .map((d) => ({ key: d.id, name: d.get('name') as string, score: (d.get(field) as number) ?? 0, at: d.get('at')?.toMillis?.() ?? 0 }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score || a.at - b.at);
        cache.set(key, list);
        setRows(list);
      })
      .catch(() => setError(true));
  }, [book, age]);

  const p = player.value;
  // before the account answers, the last visit's account and choice are shown at once (nothing pops in later)
  const waiting = user.value === undefined && !!rememberedAccount;
  const signedIn = !!user.value || waiting;
  const hidden = waiting ? (profile.value?.hidden ?? false) : p.hidden;
  async function toggleHidden() {
    setBusy(true);
    try { await setHidden(p, !p.hidden); } finally { setBusy(false); }
  }

  const mastered = progress(book).value.mastered;
  const myScore = age === 'all' ? new Set(mastered).size : new Set(mastered.filter((id) => id.split('.')[2] === age)).size;

  const mine = (key: string) => !!user.value && key.startsWith(`${user.value.uid}~`);

  return (
    <div class="board">
      <div class="lb-head">
        <div class="lb-title">
          <h2 id="lb-title">Clasament</h2>
          <p class="lb-count small muted" style={rows === null || error ? { visibility: 'hidden' } : undefined}>
            {rows ? `${rows.length} ${rows.length === 1 ? 'jucător vizibil' : 'jucători vizibili'}` : '\u00a0'}
          </p>
        </div>
        {signedIn && (
          <label class="tgl">
            <input type="checkbox" role="switch" checked={!hidden} disabled={busy || waiting} onChange={toggleHidden} />
            <span class="tgl-track" aria-hidden="true"><span class="tgl-thumb" /></span>
            <span class="tgl-text">{hidden ? 'Ascuns' : 'Vizibil'}</span>
          </label>
        )}
      </div>
      <div class="age-tabs six" role="tablist" aria-label="Nivel">
        {AGE_GROUPS.map((g) => (
          <button type="button" role="tab" aria-selected={age === g.id} onClick={() => setAge(g.id)}>{ageShort(g.id)}</button>
        ))}
        <button type="button" role="tab" aria-selected={age === 'all'} onClick={() => setAge('all')}>Toate</button>
      </div>
      {signedIn && hidden && (
        <div class="lb-hidden">
          <span class="small muted">Nu apari în clasament</span>
          <strong>{myScore} {myScore === 1 ? 'punct' : 'puncte'}</strong>
        </div>
      )}
      {user.value === null && (
        <div class="lb-guest">
          <p class="small">Joci fără cont, așa că nu apari în clasament. Progresul rămâne doar pe acest telefon.</p>
          <a class="btn btn-primary btn-block" href="/cont/inregistrare">Creează un cont</a>
        </div>
      )}
      {error ? (
        <p class="notice notice-bad">Clasamentul nu s-a putut încărca. Verifică conexiunea la internet.</p>
      ) : rows === null ? (
        <div class="lb-wait" aria-hidden="true" />
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
