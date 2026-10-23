import { useEffect, useState } from 'preact/hooks';
import { collection, FieldPath, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { AGE_GROUPS, LEVEL_KEY, type AgeGroup } from '../lib/age';
import { db } from '../lib/firebase';
import { player, setHidden } from '../lib/players';
import { progress } from '../lib/progress';
import { scoreView } from '../lib/level';
import { profile, rememberedAccount, user } from '../lib/session';
import { localGet, localSet } from '../lib/store';
import LevelPicker from './LevelPicker';

interface Row { key: string; name: string; score: number; at: number }

// Memory cache across component remounts within the same session
const cache = new Map<string, Row[]>();

const CACHE_KEY = (b: string, a: string) => `lb:${b}:${a}`;

function getCachedRows(book: string, a: AgeGroup | 'all'): Row[] | null {
  const mem = cache.get(`${book}:${a}`);
  if (mem) return mem;
  const stored = localGet<Row[] | null>(CACHE_KEY(book, a), null);
  if (stored) {
    cache.set(`${book}:${a}`, stored);
    return stored;
  }
  return null;
}

const TABS: (AgeGroup | 'all')[] = ['all', ...AGE_GROUPS.map((g) => g.id)];

async function fetchBoard(book: string, a: AgeGroup | 'all'): Promise<Row[]> {
  const key = `${book}:${a}`;
  const field = a === 'all' ? 'score' : new FieldPath('lv', LEVEL_KEY[a]);
  const snap = await getDocs(query(collection(db, 'boards', book, 'players'), orderBy(field, 'desc'), limit(100)));
  const list = snap.docs
    .map((d) => ({
      key: d.id,
      name: d.get('name') as string,
      score: (d.get(field) as number) ?? 0,
      at: d.get('at')?.toMillis?.() ?? 0,
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.at - b.at);

  cache.set(key, list);
  localSet(CACHE_KEY(book, a), list);
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
  const [age, setAgeState] = useState<AgeGroup | 'all'>(scoreView.value);
  const [rows, setRows] = useState<Row[] | null>(() => getCachedRows(book, age));
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const setAge = (next: AgeGroup | 'all') => {
    if (next === age) return;
    scoreView.value = next;
    setAgeState(next);
    // Instant switch: load cached data immediately without waiting for network
    const cached = getCachedRows(book, next);
    if (cached) {
      setRows(cached);
      setError(false);
    } else {
      setRows(null);
    }
  };

  useEffect(() => {
    let active = true;

    // Fetch active level to ensure freshest data
    fetchBoard(book, age)
      .then((list) => {
        if (active) {
          setRows(list);
          setError(false);
        }
      })
      .catch(() => {
        if (active && !cache.has(`${book}:${age}`)) setError(true);
      });

    // Prefetch other age groups in parallel so changing tabs is instant
    for (const other of TABS) {
      if (other !== age && !cache.has(`${book}:${other}`)) {
        fetchBoard(book, other).catch(() => {});
      }
    }

    return () => { active = false; };
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

      <LevelPicker<AgeGroup | 'all'>
        label="Grupa de vârstă a clasamentului"
        value={age}
        onChange={setAge}
        includeAll
      />

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
            <li key={r.key} class={`pd${i === 0 ? ' pd-1' : ''}${mine(r.key) ? ' me' : ''}`}>
              <span class="pd-rank">{i + 1}</span>
              <span class="pd-name">{r.name}</span>
              <span class="pd-score">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
