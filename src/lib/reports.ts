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

/** A concurrent admin cannot overwrite a decision or notify the player twice. */
export async function decideReport(r: Report, decision: Decision, response: string, reviewed?: Playable) {
  const u = user.value;
  if (!u) throw new Error('not_signed_in');
  const message = response.trim();
  if (!message || message.length > 1000) throw new Error('response_required');
  const current = decision === 'accepted' ? await loadReportedQuestion(r) : undefined;
  if (current && (!reviewed || questionSnapshot(current) !== questionSnapshot(reviewed))) throw new Error('question_changed');
  if (user.value?.uid !== u.uid) throw new Error('not_signed_in');
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'reports', r.id);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('report_missing');
    const latest = { ...snap.data(), id: snap.id } as Report;
    if (reportStatus(latest) !== 'pending') throw new Error('report_decided');
    if (current && !hasCorrection(latest, current)) throw new Error('question_unchanged');
    tx.update(ref, {
      status: decision, done: true, response: message,
      decidedAt: serverTimestamp(), decidedBy: u.uid, responseReadAt: null,
      ...(current ? { correctedQuestion: questionSnapshot(current), correctedText: questionSummary(current) } : {}),
    });
  });
}

export async function markResponseRead(r: Report) {
  if (user.value?.uid !== r.uid || !isUnread(r)) return;
  await updateDoc(doc(db, 'reports', r.id), { responseReadAt: serverTimestamp() });
}

export function reportError(err: unknown): string | undefined {
  const messages: Record<string, string> = {
    response_required: 'Scrie un răspuns pentru jucător (cel mult 1.000 de caractere).',
    question_unchanged: 'Întrebarea nu a fost încă modificată. Publică mai întâi corectura, apoi acceptă semnalarea.',
    question_changed: 'Întrebarea s-a schimbat între timp. Verifică din nou versiunea publicată.',
    question_unavailable: 'Întrebarea nu a putut fi verificată. Încearcă din nou.',
    report_decided: 'Această semnalare a fost deja verificată de un administrator.',
    report_missing: 'Această semnalare nu mai este disponibilă.',
  };
  return err instanceof Error ? messages[err.message] : undefined;
}
