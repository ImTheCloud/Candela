import { effect, signal, type Signal } from '@preact/signals';
import { arrayRemove, arrayUnion, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { BOOKS } from './books';
import { db } from './firebase';
import { player } from './players';
import { user } from './session';
import { localGet, localRemove, localSet } from './store';

/**
 * One document per player and book: users/{uid}/progress/{playerKey}~{book}.
 * Guests keep the same shape in localStorage until they create or enter an account.
 */
export interface Progress {
  /** Chapters marked as read. */
  read: number[];
  /** Highlighted verses, as "chapter:verse". */
  marks: string[];
  /** Questions answered fully right at least once (each counts once). */
  mastered: string[];
  /** Questions answered wrong and not yet answered right since. */
  wrong: string[];
  /** Best and last score (0–100) per past exam. */
  exams: Record<string, { best: number; last: number; at: number }>;
}

export const EMPTY: Progress = { read: [], marks: [], mastered: [], wrong: [], exams: {} };

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

export function toggleMark(book: string, ch: number, verse: number) {
  const key = `${ch}:${verse}`;
  const on = !progress(book).value.marks.includes(key);
  if (isGuest()) return guestUpdate(book, (p) => ({ ...p, marks: on ? add(p.marks, [key]) : drop(p.marks, [key]) }));
  return setDoc(ref(book), { marks: on ? arrayUnion(key) : arrayRemove(key), updatedAt: serverTimestamp() }, { merge: true });
}

export function setRead(book: string, ch: number, read: boolean) {
  if (isGuest()) return guestUpdate(book, (p) => ({ ...p, read: read ? add(p.read, [ch]) : drop(p.read, [ch]) }));
  return setDoc(ref(book), { read: read ? arrayUnion(ch) : arrayRemove(ch), updatedAt: serverTimestamp() }, { merge: true });
}

/** After a quiz: right answers become mastered and leave the mistakes list, wrong ones join it. */
export async function recordAnswers(book: string, right: string[], wrong: string[]) {
  if (isGuest()) {
    return guestUpdate(book, (p) => ({ ...p, mastered: add(p.mastered, right), wrong: drop(add(p.wrong, wrong), right) }));
  }
  const batch = writeBatch(db);
  const r = ref(book);
  batch.set(r, { mastered: arrayUnion(...right), wrong: arrayUnion(...wrong), updatedAt: serverTimestamp() }, { merge: true });
  if (right.length) batch.update(r, { wrong: arrayRemove(...right) });
  await batch.commit();
}

export function recordExam(book: string, examId: string, score: number) {
  const prev = progress(book).value.exams[examId];
  const entry = { best: Math.max(prev?.best ?? 0, score), last: score, at: Date.now() };
  if (isGuest()) return guestUpdate(book, (p) => ({ ...p, exams: { ...p.exams, [examId]: entry } }));
  return setDoc(ref(book), { exams: { [examId]: entry }, updatedAt: serverTimestamp() }, { merge: true });
}

/** A removed child takes its progress with it. */
export function deleteProgress(uid: string, playerKey: string) {
  return Promise.all(BOOKS.map((b) => deleteDoc(doc(db, 'users', uid, 'progress', `${playerKey}~${b.slug}`))));
}

// What a guest did before creating or entering an account joins the account's own progress.
effect(() => {
  const u = user.value;
  if (!u) return;
  for (const b of BOOKS) {
    const g = localGet<Partial<Progress> | null>(guestKey(b.slug), null);
    if (!g) continue;
    const p = normalize(g);
    const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (p.read.length) data.read = arrayUnion(...p.read);
    if (p.marks.length) data.marks = arrayUnion(...p.marks);
    if (p.mastered.length) data.mastered = arrayUnion(...p.mastered);
    if (p.wrong.length) data.wrong = arrayUnion(...p.wrong);
    if (Object.keys(p.exams).length) data.exams = p.exams;
    setDoc(doc(db, 'users', u.uid, 'progress', `${u.uid}~${b.slug}`), data, { merge: true }).then(() => localRemove(guestKey(b.slug)));
  }
});
