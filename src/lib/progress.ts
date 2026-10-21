import { effect, signal, type Signal } from '@preact/signals';
import { arrayRemove, arrayUnion, deleteDoc, doc, increment, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { writeBoard } from './board';
import { BOOKS } from './books';
import { db } from './firebase';
import { player, shortName } from './players';
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
  exams: Record<string, { best: number; last: number; at: number; /** chapter tests: most right answers and test size */ bestRight?: number; n?: number }>;
  /** Answers per question type: n given, r fully right (shows the weak spots). */
  stats: Partial<Record<QType, { n: number; r: number }>>;
}

/** The chapter scores of the last visit, for the tiles to show at once while Firestore answers. */
const examsKey = (playerKey: string, book: string) => `ex:${playerKey}~${book}`;
export const cachedExams = (playerKey: string, book: string) => localGet<Progress['exams']>(examsKey(playerKey, book), {});

export const EMPTY: Progress = { mastered: [], wrong: [], exams: {}, stats: {} };

const signals = new Map<string, Signal<Progress>>();
const guestKey = (book: string) => `progress:${book}`;

function normalize(data: Partial<Progress> | undefined): Progress {
  return { ...EMPTY, ...data };
}

/** Live progress of the current player in a book. */
export function progress(book: string): Signal<Progress> {
  let s = signals.get(book);
  if (s) return s;
  const sig = signal<Progress>(EMPTY);
  signals.set(book, sig);
  let stop: (() => void) | null = null;
  effect(() => {
    const u = user.value;
    const p = player.value;
    stop?.();
    stop = null;
    if (u === undefined) return;
    if (!u) {
      sig.value = normalize(localGet<Partial<Progress>>(guestKey(book), {}));
      return;
    }
    sig.value = EMPTY;
    stop = onSnapshot(doc(db, 'users', u.uid, 'progress', `${p.key}~${book}`), (snap) => {
      sig.value = normalize(snap.data() as Partial<Progress> | undefined);
      localSet(examsKey(p.key, book), sig.value.exams);
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

/**
 * After each answer: a right one becomes mastered and leaves the mistakes list, a wrong one joins it.
 * A newly mastered question also moves the player up on the public board (same batch, checked by the rules).
 */
export async function recordAnswers(book: string, answers: Answered[]) {
  const right = answers.filter((a) => a.right).map((a) => a.id);
  const wrong = answers.filter((a) => !a.right).map((a) => a.id);
  const stats: Record<string, { n: ReturnType<typeof increment>; r: ReturnType<typeof increment> }> = {};
  const counts: Record<string, { n: number; r: number }> = {};
  for (const a of answers) {
    counts[a.t] ??= { n: 0, r: 0 };
    counts[a.t].n++;
    if (a.right) counts[a.t].r++;
  }
  for (const [t, c] of Object.entries(counts)) stats[t] = { n: increment(c.n), r: increment(c.r) };

  const before = progress(book).value;
  if (isGuest()) {
    return guestUpdate(book, (p) => {
      const st = { ...p.stats };
      for (const [t, c] of Object.entries(counts)) {
        const k = t as QType;
        st[k] = { n: (st[k]?.n ?? 0) + c.n, r: (st[k]?.r ?? 0) + c.r };
      }
      return { ...p, mastered: add(p.mastered, right), wrong: drop(add(p.wrong, wrong), right), stats: st };
    });
  }
  const r = ref(book);
  // one change per field: adding to and removing from "wrong" in the same write is refused
  if (right.length && wrong.length) await setDoc(r, { wrong: arrayUnion(...wrong), updatedAt: serverTimestamp() }, { merge: true });
  const data: Record<string, unknown> = { stats, updatedAt: serverTimestamp() };
  if (right.length) {
    data.mastered = arrayUnion(...right);
    data.wrong = arrayRemove(...right);
  } else if (wrong.length) {
    data.wrong = arrayUnion(...wrong);
  }
  const batch = writeBatch(db);
  batch.set(r, data, { merge: true });
  const mastered = [...new Set([...before.mastered, ...right])];
  const p = player.value;
  const uid = user.value!.uid;
  const onBoard = mastered.length > before.mastered.length && !p.hidden;
  if (onBoard) writeBoard(book, uid, p.key, shortName(p), mastered, batch);
  await batch.commit();
  if (onBoard) {
    localSet(boardMark(uid, p.key, book), mastered.length);
  }
}

export function recordExam(book: string, examId: string, score: number, count?: { right: number; n: number }) {
  const prev = progress(book).value.exams[examId];
  const entry: Progress['exams'][string] = { best: Math.max(prev?.best ?? 0, score), last: score, at: Date.now() };
  if (count) { entry.bestRight = Math.max(prev?.bestRight ?? 0, count.right); entry.n = count.n; }
  if (isGuest()) return guestUpdate(book, (p) => ({ ...p, exams: { ...p.exams, [examId]: entry } }));
  return setDoc(ref(book), { exams: { [examId]: entry }, updatedAt: serverTimestamp() }, { merge: true });
}

/** A removed child takes its progress with it. */
export function deleteProgress(uid: string, playerKey: string) {
  return Promise.all(BOOKS.map((b) => deleteDoc(doc(db, 'users', uid, 'progress', `${playerKey}~${b.slug}`))));
}

const boardMark = (uid: string, key: string, book: string) => `bd:${uid}~${key}~${book}`;

// The boards are filled from the progress: a player who answered before they existed
// (or whose entry is out of date) gets their entry written once, and again whenever the number of known questions changes.
effect(() => {
  const u = user.value;
  const p = player.value;
  if (!u || p.hidden) return;
  for (const b of BOOKS) {
    const prog = progress(b.slug).value;
    if (!prog.mastered.length || localGet<number | null>(boardMark(u.uid, p.key, b.slug), null) === prog.mastered.length) continue;
    localSet(boardMark(u.uid, p.key, b.slug), prog.mastered.length);
    Promise.resolve(writeBoard(b.slug, u.uid, p.key, shortName(p), prog.mastered))
      .catch((e) => { console.error(e); localRemove(boardMark(u.uid, p.key, b.slug)); });
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
