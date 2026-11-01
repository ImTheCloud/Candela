import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import {
  collection,
  FieldPath,
  limit,
  onSnapshot,
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
import { formatFirstLast, player, shortName } from '../lib/players';
import { progress } from '../lib/progress';
import { user } from '../lib/session';
import LevelPicker from './LevelPicker';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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

function rowsEqual(a: Row[] | null, b: Row[] | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].key !== b[i].key || a[i].score !== b[i].score || a[i].name !== b[i].name) {
      return false;
    }
  }
  return true;
}

interface PendingAnimation {
  prevPositions: Map<string, number>;
  bumpedKeys: Set<string>;
  advancedKeys: Set<string>;
  newKeys: Set<string>;
}

interface Props {
  book: string;
  bookName?: string;
  totals?: Record<string, number>;
}

/** Public board of a book: live real-time sync with FLIP animations and score pop. */
export default function Board({ book }: Props) {
  const [age, setAgeState] = useState<Level | 'all'>(scoreView.value);
  const [rows, setRows] = useState<Row[] | null>(() => getCached(`${book}:${scoreView.value}`));
  const [error, setError] = useState(false);
  const [switching, setSwitching] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<number | null>(null);

  // References to track DOM elements for FLIP & pops
  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const scoreRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Pending animation payload calculated before state update
  const pendingAnimRef = useRef<PendingAnimation | null>(null);

  // Track previous rows state to detect rank and score changes
  const prevRowsRef = useRef<Row[] | null>(rows);
  const isInitialSnapshotRef = useRef(true);

  const setAge = (next: Level | 'all') => {
    if (next === age) return;

    // Anchor current board viewport position and lock height to prevent any scroll jump
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      scrollAnchorRef.current = rect.top;
      boardRef.current.style.minHeight = `${rect.height}px`;
    }

    setScoreView(next);
    setAgeState(next);
    isInitialSnapshotRef.current = true;
    pendingAnimRef.current = null;
    const existing = getCached(`${book}:${next}`);
    if (existing) {
      setRows(existing);
      prevRowsRef.current = existing;
      setSwitching(false);
      setError(false);
    } else {
      // Keep previous rows visible (dimmed) instead of collapsing into null/skeletons
      setSwitching(true);
    }
  };

  useEffect(() => {
    let active = true;
    isInitialSnapshotRef.current = true;
    pendingAnimRef.current = null;

    const cacheKey = `${book}:${age}`;
    const field = age === 'all' ? 'score' : new FieldPath('lv', LEVEL_KEY[age]);
    const q = query(
      collection(db, 'boards', book, 'players'),
      where(field, '>', 0),
      orderBy(field, 'desc'),
      limit(SIZE)
    );

    // Timeout fallback if offline or no network connection
    const timer = setTimeout(() => {
      if (active && rows === null) {
        const fallback = getCached(cacheKey);
        if (fallback) {
          setRows(fallback);
          prevRowsRef.current = fallback;
          setError(false);
        } else {
          setError(true);
        }
      }
    }, 6000);

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!active) return;
        clearTimeout(timer);
        setError(false);

        const freshList = parseSnapshot(snap, age);

        // If data is identical to previous rows, skip redundant work
        if (prevRowsRef.current && rowsEqual(prevRowsRef.current, freshList)) {
          setCached(cacheKey, freshList);
          return;
        }

        // On initial snapshot for this tab, silently set rows without running FLIP
        if (isInitialSnapshotRef.current) {
          isInitialSnapshotRef.current = false;
          setCached(cacheKey, freshList);
          prevRowsRef.current = freshList;
          setRows(freshList);
          setSwitching(false);
          runAutoHeal(freshList);
          return;
        }

        // Real-time live update received while viewing: calculate FLIP & pops
        const prev = prevRowsRef.current || [];
        const prevMap = new Map<string, { rank: number; score: number }>();
        prev.forEach((r, idx) => prevMap.set(r.key, { rank: idx, score: r.score }));

        const bumpedKeys = new Set<string>();
        const advancedKeys = new Set<string>();
        const newKeys = new Set<string>();

        freshList.forEach((r, idx) => {
          const old = prevMap.get(r.key);
          if (!old) {
            newKeys.add(r.key);
          } else {
            if (r.score > old.score) {
              bumpedKeys.add(r.key);
            }
            if (idx < old.rank) {
              advancedKeys.add(r.key);
            }
          }
        });

        // Record FIRST bounding positions of currently rendered cards
        const prevPositions = new Map<string, number>();
        for (const [key, el] of cardRefs.current.entries()) {
          if (el) {
            prevPositions.set(key, el.getBoundingClientRect().top);
          }
        }

        pendingAnimRef.current = {
          prevPositions,
          bumpedKeys,
          advancedKeys,
          newKeys,
        };

        setCached(cacheKey, freshList);
        prevRowsRef.current = freshList;
        setRows(freshList);
        setSwitching(false);
        runAutoHeal(freshList);
      },
      () => {
        if (!active) return;
        clearTimeout(timer);
        const fallback = getCached(cacheKey);
        if (fallback) {
          setRows(fallback);
          prevRowsRef.current = fallback;
          setSwitching(false);
          setError(false);
        } else if (!rows) {
          setSwitching(false);
          setError(true);
        }
      }
    );

    function runAutoHeal(list: Row[]) {
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
              .catch((e) => console.error('Eroare auto-heal clasament:', e));
          }
        }
      }
    }

    return () => {
      active = false;
      clearTimeout(timer);
      unsub();
    };
  }, [book, age]);

  // Execute FLIP and animations right after DOM update before paint
  useIsomorphicLayoutEffect(() => {
    // Keep board viewport position strictly stable when switching levels
    if (scrollAnchorRef.current !== null && boardRef.current) {
      const currentTop = boardRef.current.getBoundingClientRect().top;
      const delta = currentTop - scrollAnchorRef.current;
      if (Math.abs(delta) > 1) {
        window.scrollBy({ top: delta, behavior: 'instant' });
      }
      scrollAnchorRef.current = null;
      requestAnimationFrame(() => {
        if (boardRef.current) {
          boardRef.current.style.minHeight = '';
        }
      });
    }

    const anim = pendingAnimRef.current;
    if (!anim) return;
    pendingAnimRef.current = null;

    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // 1. FLIP vertical movement for rows changing position
    for (const [key, prevTop] of anim.prevPositions.entries()) {
      const el = cardRefs.current.get(key);
      if (!el) continue;
      const newTop = el.getBoundingClientRect().top;
      const deltaY = prevTop - newTop;

      if (Math.abs(deltaY) > 0.5) {
        el.animate(
          [
            { transform: `translate3d(0, ${deltaY}px, 0)` },
            { transform: 'translate3d(0, 0, 0)' }
          ],
          {
            duration: 600,
            easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
          }
        );
      }
    }

    // 2. Celebratory highlight on card advancing in rank
    for (const key of anim.advancedKeys) {
      const el = cardRefs.current.get(key);
      if (el) {
        el.animate(
          [
            { boxShadow: '0 0 0 0 rgba(46, 125, 50, 0)' },
            { boxShadow: '0 0 0 3px rgba(46, 125, 50, 0.45)', backgroundColor: 'rgba(46, 125, 50, 0.08)' },
            { boxShadow: '0 0 0 0 rgba(46, 125, 50, 0)' }
          ],
          {
            duration: 1200,
            easing: 'ease-out',
          }
        );
      }
    }

    // 3. Pop / bump score number for players with increased points
    for (const key of anim.bumpedKeys) {
      const scoreEl = scoreRefs.current.get(key);
      if (scoreEl) {
        scoreEl.animate(
          [
            { transform: 'scale(1)', color: 'inherit' },
            { transform: 'scale(1.45)', color: '#2e7d32' },
            { transform: 'scale(1)', color: 'inherit' }
          ],
          {
            duration: 750,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          }
        );
      }
    }

    // 4. Subtle entrance for brand new rows entering the board
    for (const key of anim.newKeys) {
      const el = cardRefs.current.get(key);
      if (el) {
        el.animate(
          [
            { opacity: 0, transform: 'scale(0.92)' },
            { opacity: 1, transform: 'scale(1)' }
          ],
          {
            duration: 450,
            easing: 'ease-out',
          }
        );
      }
    }
  }, [rows]);

  const mine = (key: string) => !!user.value && key.startsWith(`${user.value.uid}~`);

  return (
    <div class="board" ref={boardRef}>
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
        <p class="lb-empty">Niciun jucător încă. Fii primul!</p>
      ) : (
        <ol class={`lb-cards${switching ? ' is-switching' : ''}`} aria-busy={switching}>
          {rows.map((r, i) => (
            <li
              key={r.key}
              ref={(el) => {
                if (el) cardRefs.current.set(r.key, el);
                else cardRefs.current.delete(r.key);
              }}
              class={`pd${i < 3 ? ` pd-${i + 1}` : ''}`}
            >
              <span class="pd-rank">{i + 1}</span>
              <span class="pd-name">
                <span class="pd-text">{formatFirstLast(r.name)}</span>
                {mine(r.key) && <span class="pd-me">Eu</span>}
              </span>
              <span
                class="pd-score"
                ref={(el) => {
                  if (el) scoreRefs.current.set(r.key, el);
                  else scoreRefs.current.delete(r.key);
                }}
              >
                {r.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
