import { computed, effect, signal, type Signal } from '@preact/signals';
import { arrayRemove, arrayUnion, deleteDoc, doc, getDoc, increment, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { writeBoard } from './board';
import { BOOKS } from './books';
import { db } from './firebase';
import { player, players, shortName } from './players';
import type { QType } from './questions';
import { user } from './session';
import { localGet, localRemove, localSet } from './store';

/**
 * One document per player and book: users/{uid}/progress/{playerKey}~{book}.
 * Guests keep the same shape in localStorage until they create or enter an account.
 */
export interface Progress {
  /** Questions answered fully right at least once (each counts once). */
  mastered: string[];
  /** Questions answered wrong and not yet answered right since. */
  wrong: string[];
  /** Best and last score (0–100) per past exam. */
  exams: Record<string, { best: number; last: number; at: number; /** chapter tests: most right answers and test size */ bestRight?: number; n?: number; /** how many times it was played */ plays?: number }>;
  /** Answers per question type: n given, r fully right (shows the weak spots). */
  stats: Partial<Record<QType, { n: number; r: number }>>;
  /** The same answers, per level (recorded since November 2026: older answers count only in `stats`). */
  lv?: Partial<Record<string, Partial<Record<QType, { n: number; r: number }>>>>;
}

export const EMPTY: Progress = { mastered: [], wrong: [], exams: {}, stats: {} };

const signals = new Map<string, Signal<Progress>>();
const loadedSignals = new Map<string, Signal<boolean>>();

/** True once the current player's progress in the book has come from Firestore (false again while another player's loads). */
export function progressLoaded(book: string): Signal<boolean> {
  progress(book);
  return loadedSignals.get(book)!;
}
const guestKey = (book: string) => `progress:${book}`;

// the key alone: a change of the profile (name, timer, last visit) gives a new player object, not another player
const playerKey = computed(() => player.value.key);

/** Resolves once the current player's progress in the book has come from Firestore. */
function whenLoaded(book: string, timeoutMs = 5000): Promise<void> {
  if (progressLoaded(book).value) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    let stop: (() => void) | undefined;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        stop?.();
        resolve();
      }
    }, timeoutMs);

    stop = effect(() => {
      if (!progressLoaded(book).value) return;
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve();
        queueMicrotask(() => stop?.());
      }
    });
  });
}

function normalize(data: Partial<Progress> | undefined): Progress {
  return { ...EMPTY, ...data };
}

/** Live progress of the current player in a book. */
export function progress(book: string): Signal<Progress> {
  let s = signals.get(book);
  if (s) return s;
  const sig = signal<Progress>(EMPTY);
  signals.set(book, sig);
  const loaded = signal(false);
  loadedSignals.set(book, loaded);
  let stop: (() => void) | null = null;
  effect(() => {
    const u = user.value;
    const key = playerKey.value;
    stop?.();
    stop = null;
    if (u === undefined) return;
    if (!u) {
      sig.value = normalize(localGet<Partial<Progress>>(guestKey(book), {}));
      loaded.value = true;
      return;
    }
    sig.value = EMPTY;
    loaded.value = false;
    stop = onSnapshot(doc(db, 'users', u.uid, 'progress', `${key}~${book}`), (snap) => {
      sig.value = normalize(snap.data() as Partial<Progress> | undefined);
      loaded.value = true;
    });
  });
  return sig;
}

function ref(book: string) {
  const u = user.value!;
  return doc(db, 'users', u.uid, 'progress', `${player.value.key}~${book}`);
}

function guestUpdate(book: string, change: (p: Progress) => Progress) {
  const next = change(progress(book).value);
  progress(book).value = next;
  localSet(guestKey(book), next);
}

const isGuest = () => !user.value;
const add = <T,>(list: T[], items: T[]) => [...new Set([...list, ...items])];
const drop = <T,>(list: T[], items: T[]) => list.filter((x) => !items.includes(x));

export interface Answered { id: string; t: QType; right: boolean }

export interface ExamInfo {
  id: string;
  score: number;
  count?: { right: number; n: number };
}

/**
 * Atomically saves all quiz results (answers, stats, level stats, mastered, wrong, and exams)
 * in a SINGLE Firestore write operation to prevent race conditions or partial saves.
 * Immediately synchronizes the public leaderboard once committed.
 */
export async function saveQuizResult(
  book: string,
  answers?: Answered[],
  points = true,
  exam?: ExamInfo
): Promise<void> {
  const right = answers ? answers.filter((a) => a.right).map((a) => a.id) : [];
  const gain = points ? right : [];
  const wrong = answers ? answers.filter((a) => !a.right).map((a) => a.id) : [];

  const counts: Record<string, { n: number; r: number }> = {};
  const byLevel: Record<string, Record<string, { n: number; r: number }>> = {};

  if (answers && answers.length > 0) {
    for (const a of answers) {
      counts[a.t] ??= { n: 0, r: 0 };
      counts[a.t].n++;
      if (a.right) counts[a.t].r++;
    }
    for (const a of answers) {
      const l = a.id.split('.')[2];
      if (l !== 'usor' && l !== 'mediu' && l !== 'greu') continue;
      const c = ((byLevel[l] ??= {})[a.t] ??= { n: 0, r: 0 });
      c.n++;
      if (a.right) c.r++;
    }
  }

  if (isGuest()) {
    guestUpdate(book, (p) => {
      let nextP = { ...p };
      if (answers && answers.length > 0) {
        const st = { ...nextP.stats };
        for (const [t, c] of Object.entries(counts)) {
          const k = t as QType;
          st[k] = { n: (st[k]?.n ?? 0) + c.n, r: (st[k]?.r ?? 0) + c.r };
        }
        nextP = {
          ...nextP,
          mastered: add(nextP.mastered, gain),
          wrong: drop(add(nextP.wrong, wrong), right),
          stats: st,
        };
      }
      if (exam) {
        const prev = nextP.exams[exam.id];
        const entry: Progress['exams'][string] = {
          best: Math.max(prev?.best ?? 0, exam.score),
          last: exam.score,
          at: Date.now(),
          plays: (prev?.plays ?? (prev ? 1 : 0)) + 1,
        };
        if (exam.count) {
          entry.bestRight = Math.max(prev?.bestRight ?? 0, exam.count.right);
          entry.n = exam.count.n;
        }
        nextP.exams = { ...nextP.exams, [exam.id]: entry };
      }
      return nextP;
    });
    return;
  }

  await whenLoaded(book);
  const curProg = progress(book).value;
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (answers && answers.length > 0) {
    const stats: Record<string, { n: ReturnType<typeof increment>; r: ReturnType<typeof increment> }> = {};
    for (const [t, c] of Object.entries(counts)) stats[t] = { n: increment(c.n), r: increment(c.r) };
    data.stats = stats;

    const lv = Object.fromEntries(
      Object.entries(byLevel).map(([l, ts]) => [
        l,
        Object.fromEntries(Object.entries(ts).map(([t, c]) => [t, { n: increment(c.n), r: increment(c.r) }])),
      ])
    );
    data.lv = lv;

    if (gain.length > 0) {
      data.mastered = arrayUnion(...gain);
    }
    const currentWrong = curProg.wrong || [];
    data.wrong = drop(add(currentWrong, wrong), right);
  }

  if (exam) {
    const prev = curProg.exams?.[exam.id];
    const entry: Progress['exams'][string] = {
      best: Math.max(prev?.best ?? 0, exam.score),
      last: exam.score,
      at: Date.now(),
      plays: (prev?.plays ?? (prev ? 1 : 0)) + 1,
    };
    if (exam.count) {
      entry.bestRight = Math.max(prev?.bestRight ?? 0, exam.count.right);
      entry.n = exam.count.n;
    }
    data.exams = { [exam.id]: entry };
  }

  // Single atomic write to Firestore
  const r = ref(book);
  await setDoc(r, data, { merge: true });

  // Update public board immediately once progress is committed
  const u = user.value;
  const p = player.value;
  if (u && p && gain.length > 0) {
    const fullMastered = add(curProg.mastered || [], gain);
    try {
      await writeBoard(book, u.uid, p.key, shortName(p), fullMastered);
      localSet(boardMark(u.uid, p.key, book), `${shortName(p)}:${fullMastered.length}`);
    } catch (err) {
      console.error('Eroare la sincronizarea clasamentului:', err);
    }
  }
}

/** Legacy wrapper for answers recording */
export function recordAnswers(book: string, answers: Answered[], points = true) {
  return saveQuizResult(book, answers, points);
}

/** Legacy wrapper for exam recording */
export function recordExam(book: string, examId: string, score: number, count?: { right: number; n: number }) {
  return saveQuizResult(book, undefined, false, { id: examId, score, count });
}

/** "17/21" for a test or an exam. Entries from before the count was kept have only a percentage: the count is worked out from it until the test is played again. */
export function scoreLabel(e: Progress['exams'][string] | undefined, size: number): string | undefined {
  if (!e) return undefined;
  if (e.bestRight !== undefined && e.n) return `${e.bestRight}/${e.n}`;
  return size ? `${Math.round((e.best / 100) * size)}/${size}` : undefined;
}

/** A removed child takes its progress with it. */
export function deleteProgress(uid: string, playerKey: string) {
  return Promise.all(BOOKS.map((b) => deleteDoc(doc(db, 'users', uid, 'progress', `${playerKey}~${b.slug}`))));
}

// v2: entries now also exist at 0 points and carry every level, so each one is written again once
const boardMark = (uid: string, key: string, book: string) => `bd3:${uid}~${key}~${book}`;

// Everyone who comes into this version is on the boards, at 0 points until they know a question.
// The playing player's entry follows their progress; the account's other players get theirs written once.
effect(() => {
  const u = user.value;
  const p = player.value;
  if (!u) return;
  for (const b of BOOKS) {
    if (!progressLoaded(b.slug).value) continue;
    const prog = progress(b.slug).value;
    const mark = boardMark(u.uid, p.key, b.slug);
    const expected = `${shortName(p)}:${prog.mastered.length}`;
    if (localGet<string | null>(mark, null) === expected) continue;
    Promise.resolve(writeBoard(b.slug, u.uid, p.key, shortName(p), prog.mastered))
      .then(() => localSet(mark, expected))
      .catch((e) => { console.error(e); localRemove(mark); });
  }
});

effect(() => {
  const u = user.value;
  if (!u) return;
  const current = player.value.key;
  for (const p of players.value) {
    if (p.key === current) continue;
    for (const b of BOOKS) {
      const mark = boardMark(u.uid, p.key, b.slug);
      getDoc(doc(db, 'users', u.uid, 'progress', `${p.key}~${b.slug}`))
        .then((snap) => {
          const mastered = (snap.get('mastered') as string[] | undefined) ?? [];
          const expected = `${shortName(p)}:${mastered.length}`;
          if (localGet<string | null>(mark, null) === expected) return;
          return Promise.resolve(writeBoard(b.slug, u.uid, p.key, shortName(p), mastered))
            .then(() => localSet(mark, expected));
        })
        .catch((e) => { console.error(e); localRemove(mark); });
    }
  }
});

// What a guest did before creating or entering an account joins the account's own progress.
effect(() => {
  const u = user.value;
  if (!u) return;
  for (const b of BOOKS) {
    const g = localGet<Partial<Progress> | null>(guestKey(b.slug), null);
    if (!g) continue;
    const p = normalize(g);
    const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (p.mastered.length) data.mastered = arrayUnion(...p.mastered);
    if (p.wrong.length) data.wrong = arrayUnion(...p.wrong);
    if (Object.keys(p.exams).length) data.exams = p.exams;
    if (Object.keys(p.stats).length) data.stats = Object.fromEntries(Object.entries(p.stats).map(([t, c]) => [t, { n: increment(c!.n), r: increment(c!.r) }]));
    setDoc(doc(db, 'users', u.uid, 'progress', `${u.uid}~${b.slug}`), data, { merge: true }).then(() => localRemove(guestKey(b.slug)));
  }
});
