import { useEffect, useState } from 'preact/hooks';
import {
  collection,
  FieldPath,
  getDocs,
  getDocsFromCache,
  limit,
  orderBy,
  query,
  where,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { LEVEL_KEY, type Level } from '../lib/age';
import { boardChangedAt, writeBoard } from '../lib/board';
import { db } from '../lib/firebase';
import { scoreView, setScoreView } from '../lib/level';
import { localGet, localSet } from '../lib/store';
import { player, shortName } from '../lib/players';
import { progress } from '../lib/progress';
import { user } from '../lib/session';
import LevelPicker from './LevelPicker';

interface Row { key: string; name: string; score: number; at: number }

// Freshness threshold: 5 minutes in memory, but we display cached data immediately
const FRESH = 5 * 60 * 1000;
const SIZE = 50;

interface CacheEntry {
  rows: Row[];
  at: number;
}

const memoryCache = new Map<string, CacheEntry>();

function getCached(key: string): Row[] | null {
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.at < FRESH && mem.at > boardChangedAt) {
    return mem.rows;
  }
  const stored = localGet<CacheEntry | null>(`board:${key}`, null);
  if (stored && Array.isArray(stored.rows) && stored.at > boardChangedAt) {
    memoryCache.set(key, stored);
    return stored.rows;
  }
  return null;
}

function setCached(key: string, rows: Row[]): void {
  const entry: CacheEntry = { rows, at: Date.now() };
  memoryCache.set(key, entry);
  localSet(`board:${key}`, entry);
}

function parseSnapshot(snap: QuerySnapshot<DocumentData>, a: Level | 'all'): Row[] {
  return snap.docs
    .map((d) => {
      const score = a === 'all'
        ? ((d.get('score') as number) ?? 0)
        : ((d.data()?.lv?.[LEVEL_KEY[a]] as number) ?? 0);
      return {
        key: d.id,
        name: (d.get('name') as string) || 'Anonim',
        score,
        at: d.get('at')?.toMillis?.() ?? 0,
      };
    })
    .sort((x, y) => y.score - x.score || x.at - y.at);
}

async function fetchBoard(book: string, a: Level | 'all'): Promise<Row[]> {
  const key = `${book}:${a}`;
  const field = a === 'all' ? 'score' : new FieldPath('lv', LEVEL_KEY[a]);
  const q = query(
    collection(db, 'boards', book, 'players'),
    where(field, '>', 0),
    orderBy(field, 'desc'),
    limit(SIZE)
  );

  // 1. Try local Firestore IndexedDB cache first
  let localList: Row[] | null = null;
  try {
    const cachedSnap = await getDocsFromCache(q);
    if (!cachedSnap.empty) {
      localList = parseSnapshot(cachedSnap, a);
    }
  } catch {}

  // 2. Query server with 5-second timeout so mobile never hangs
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), 5000);
  });

  try {
    const snap = await Promise.race([getDocs(q), timeoutPromise]);
    clearTimeout(timer);
    const list = parseSnapshot(snap, a);
    setCached(key, list);
    return list;
  } catch (err) {
    clearTimeout(timer);
    if (localList && localList.length > 0) {
      setCached(key, localList);
      return localList;
    }
    const fallback = getCached(key);
    if (fallback) return fallback;
    throw err;
  }
}

interface Props {
  book: string;
  bookName?: string;
  totals?: Record<string, number>;
}

/** Public board of a book: all levels together or one level. Each question counts once; ties go to whoever got there first. */
export default function Board({ book }: Props) {
  const [age, setAgeState] = useState<Level | 'all'>(scoreView.value);
  const [rows, setRows] = useState<Row[] | null>(() => getCached(`${book}:${scoreView.value}`));
  const [error, setError] = useState(false);

  const setAge = (next: Level | 'all') => {
    if (next === age) return;
    setScoreView(next);
    setAgeState(next);
    const existing = getCached(`${book}:${next}`);
    if (existing) {
      setRows(existing);
      setError(false);
    } else {
      setRows(null);
    }
  };

  useEffect(() => {
    let active = true;

    // Immediately display cached rows if we were waiting
    const existing = getCached(`${book}:${age}`);
    if (existing && rows === null) {
      setRows(existing);
      setError(false);
    }

    fetchBoard(book, age)
      .then((list) => {
        if (active) {
          setRows(list);
          setError(false);

          // Auto-heal: verify current logged-in player's score on the board matches their actual progress
          if (user.value && player.value) {
            const u = user.value;
            const p = player.value;
            const myKey = `${u.uid}~${p.key}`;
            const prog = progress(book).value;
            const mastered = prog?.mastered || [];
            if (mastered.length > 0) {
              const myRow = list.find((r) => r.key === myKey);
              const expectedScore = age === 'all'
                ? mastered.length
                : mastered.filter((id) => id.split('.')[2] === age).length;
              if ((!myRow && expectedScore > 0) || (myRow && myRow.score !== expectedScore)) {
                writeBoard(book, u.uid, p.key, shortName(p), mastered)
                  .then(() => fetchBoard(book, age))
                  .then((fresh) => { if (active) setRows(fresh); })
                  .catch((e) => console.error('Eroare auto-heal clasament:', e));
              }
            }
          }
        }
      })
      .catch(() => {
        if (active) {
          const fallback = getCached(`${book}:${age}`);
          if (fallback) {
            setRows(fallback);
            setError(false);
          } else if (!rows) {
            setError(true);
          }
        }
      });

    return () => {
      active = false;
    };
  }, [book, age]);

  const mine = (key: string) => !!user.value && key.startsWith(`${user.value.uid}~`);

  return (
    <div class="board">
      <div class="lb-head">
        <h2 id="lb-title">Clasament</h2>
        <p class="lb-count small muted" style={rows === null || error ? { visibility: 'hidden' } : undefined}>
          {rows ? `${rows.length} ${rows.length === 1 ? 'jucător' : 'jucători'}` : '\u00a0'}
        </p>
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
