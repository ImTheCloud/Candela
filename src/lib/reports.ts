import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, type Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Playable } from './questions';
import { user } from './session';
import { localGet, localSet } from './store';

// reports/{id}: a player says a question is wrong. Only signed-in players send them, only admins read them.
export const REASONS = [
  { id: 'answer', label: 'Răspunsul corect nu este bun' },
  { id: 'text', label: 'Întrebarea nu se potrivește cu textul biblic' },
  { id: 'unclear', label: 'Întrebarea nu este clară' },
  { id: 'typo', label: 'Greșeală de scriere' },
  { id: 'other', label: 'Altceva' },
] as const;
export type Reason = (typeof REASONS)[number]['id'];

export interface Report {
  id: string;
  qid: string;
  book: string;
  ch: number;
  ref: string;
  q: string;
  reason: Reason;
  note: string;
  by: string;
  done: boolean;
  at: Timestamp | null;
}

const SENT = 'reported';

export function alreadyReported(qid: string): boolean {
  return localGet<string[]>(SENT, []).includes(qid);
}

export async function sendReport(q: Playable, reason: Reason, note: string, by: string) {
  const u = user.value;
  if (!u) throw new Error('not_signed_in');
  await addDoc(collection(db, 'reports'), {
    uid: u.uid,
    by: by.slice(0, 80),
    qid: q.id,
    book: q.book,
    ch: q.ch,
    ref: q.ref,
    q: q.q.slice(0, 500),
    reason,
    note: note.trim().slice(0, 1000),
    done: false,
    at: serverTimestamp(),
  });
  localSet(SENT, [...localGet<string[]>(SENT, []), q.id].slice(-500));
}

/** Number of reports still to look at, for the badge on the admin's avatar. */
export function watchOpenCount(cb: (n: number) => void) {
  return onSnapshot(query(collection(db, 'reports'), where('done', '==', false)), (snap) => cb(snap.size), () => {});
}

/** Newest first; for the admin page. */
export function watchReports(cb: (r: Report[]) => void, onError: () => void) {
  return onSnapshot(
    query(collection(db, 'reports'), orderBy('at', 'desc'), limit(300)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Report, 'id'>) }))),
    onError,
  );
}

export function setDone(id: string, done: boolean) {
  return updateDoc(doc(db, 'reports', id), { done });
}

export function removeReport(id: string) {
  return deleteDoc(doc(db, 'reports', id));
}
