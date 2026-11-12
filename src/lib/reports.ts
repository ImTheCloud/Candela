import { addDoc, collection, doc, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import type { Playable } from './questions';
import { hasCorrection, isUnread, questionSnapshot, questionSummary, reportStatus, type Decision, type Reason, type Report } from './report-model';
import { user } from './session';
import { localGet, localSet } from './store';

export { REASONS, isUnread, reportStatus } from './report-model';
export type { Decision, Reason, Report } from './report-model';

// Keep duplicate-report hints separate for each account on a shared device.
const sentKey = () => `reported:${user.value?.uid ?? 'guest'}`;
export const alreadyReported = (qid: string): boolean => localGet<string[]>(sentKey(), []).includes(qid);

export async function sendReport(q: Playable, reason: Reason, note: string, by: string) {
  const u = user.value;
  if (!u) throw new Error('not_signed_in');
  await addDoc(collection(db, 'reports'), {
    uid: u.uid, by: by.slice(0, 80), qid: q.id, book: q.book, ch: q.ch,
    ref: q.ref, q: q.q.slice(0, 500), reason, note: note.trim().slice(0, 1000),
    originalQuestion: questionSnapshot(q), status: 'pending', done: false, at: serverTimestamp(),
  });
  const key = `reported:${u.uid}`;
  localSet(key, [...localGet<string[]>(key, []), q.id].slice(-500));
}

export function watchOpenCount(cb: (n: number) => void) {
  return onSnapshot(query(collection(db, 'reports'), where('done', '==', false)), (snap) => cb(snap.size), () => cb(0));
}

/** Owner queries are constrained by uid, including in the security rules. No history truncation. */
export function watchReports(uid: string | null, cb: (r: Report[]) => void, onError: () => void) {
  const source = uid ? query(collection(db, 'reports'), where('uid', '==', uid)) : collection(db, 'reports');
  return onSnapshot(source, (snap) => {
    const reports = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Report));
    reports.sort((a, b) => (b.at?.toMillis() ?? 0) - (a.at?.toMillis() ?? 0));
    cb(reports);
  }, onError);
}

export function watchUnreadCount(uid: string, cb: (n: number) => void) {
  return watchReports(uid, (reports) => cb(reports.filter(isUnread).length), () => cb(0));
}

/** Always check the published chapter afresh, not the quiz's in-memory cache. */
export async function loadReportedQuestion(r: Report): Promise<Playable> {
  if (!['1-samuel', '2-samuel'].includes(r.book) || !Number.isInteger(r.ch) || r.ch < 1) {
    throw new Error('question_unavailable');
  }
  const res = await fetch(`/data/${r.book}/${r.ch}.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('question_unavailable');
  const data = await res.json() as { questions: Playable[] };
  const question = data.questions.find((q) => q.id === r.qid);
  if (!question) throw new Error('question_unavailable');
  return question;
}

/**
 * One click, no comment: the player just learns whether the report was accepted or rejected.
 * On acceptance, the published chapter is re-read and the corrected version is kept when it differs.
 * A concurrent admin cannot overwrite a decision or notify the player twice.
 */
export async function decideReport(r: Report, decision: Decision) {
  const u = user.value;
  if (!u) throw new Error('not_signed_in');
  const current = decision === 'accepted' ? await loadReportedQuestion(r).catch(() => undefined) : undefined;
  if (user.value?.uid !== u.uid) throw new Error('not_signed_in');
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'reports', r.id);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('report_missing');
    const latest = { ...snap.data(), id: snap.id } as Report;
    if (reportStatus(latest) !== 'pending') throw new Error('report_decided');
    const corrected = current && hasCorrection(latest, current) ? current : undefined;
    tx.update(ref, {
      status: decision, done: true,
      decidedAt: serverTimestamp(), decidedBy: u.uid, responseReadAt: null,
      ...(corrected ? { correctedQuestion: questionSnapshot(corrected), correctedText: questionSummary(corrected) } : {}),
    });
  });
  // An admin deciding a report they sent themselves already knows the answer.
  if (r.uid === u.uid) await updateDoc(doc(db, 'reports', r.id), { responseReadAt: serverTimestamp() }).catch(() => {});
}

export async function markResponseRead(r: Report) {
  if (user.value?.uid !== r.uid || !isUnread(r)) return;
  await updateDoc(doc(db, 'reports', r.id), { responseReadAt: serverTimestamp() });
}

export function reportError(err: unknown): string | undefined {
  const messages: Record<string, string> = {
    report_decided: 'Această semnalare a fost deja verificată de un administrator.',
    report_missing: 'Această semnalare nu mai este disponibilă.',
  };
  return err instanceof Error ? messages[err.message] : undefined;
}
