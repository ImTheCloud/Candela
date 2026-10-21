import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, type WriteBatch } from 'firebase/firestore';
import { AGE_GROUPS, LEVEL_KEY, type AgeGroup } from './age';
import { BOOKS } from './books';
import { db } from './firebase';

/**
 * Public boards (everyone reads, the account writes its own players):
 *   boards/{book}/players/{uid}~{playerKey}  { name, score, lv, ct, ch, at }
 *     score  questions known in the book (checked by the rules against the progress)
 *     lv     known per level            {a: 12, c: 30}           -> board of a book at one level
 *     ct     known per chapter          {"5": 17}                -> board of a chapter, all levels
 *     ch     known per chapter and level {"5": {c: 9}}           -> board of a chapter at one level
 *   boards/all/players/{uid}~{playerKey}     { name, score, at }  known in every book -> board of the whole app
 * Each known question counts once (the ids in `mastered`: "1sa.5.14-15.7" = book, chapter, level, number).
 */
export interface BoardFields {
  score: number;
  lv: Record<string, number>;
  ct: Record<string, number>;
  ch: Record<string, Record<string, number>>;
}

const LEVELS = new Set<string>(AGE_GROUPS.map((g) => g.id));

export function boardFields(mastered: string[]): BoardFields {
  const lv: BoardFields['lv'] = {};
  const ct: BoardFields['ct'] = {};
  const ch: BoardFields['ch'] = {};
  for (const id of new Set(mastered)) {
    const [, chapter, lvl] = id.split('.');
    if (!chapter || !LEVELS.has(lvl)) continue;
    const k = LEVEL_KEY[lvl as AgeGroup];
    lv[k] = (lv[k] ?? 0) + 1;
    ct[chapter] = (ct[chapter] ?? 0) + 1;
    (ch[chapter] ??= {})[k] = (ch[chapter][k] ?? 0) + 1;
  }
  return { score: new Set(mastered).size, lv, ct, ch };
}

export const boardRef = (book: string, uid: string, key: string) => doc(db, 'boards', book, 'players', `${uid}~${key}`);

/** The player's entry in a book's board (in a batch, or on its own). */
export function writeBoard(book: string, uid: string, key: string, name: string, mastered: string[], batch?: WriteBatch) {
  const data = { name, ...boardFields(mastered), at: serverTimestamp() };
  return batch ? batch.set(boardRef(book, uid, key), data) : setDoc(boardRef(book, uid, key), data);
}

/** The player's entry in the board of the whole app: the sum over every book, read fresh from the progress documents. */
export async function writeAllBoard(uid: string, key: string, name: string) {
  const sizes = await Promise.all(BOOKS.map(async (b) => {
    const snap = await getDoc(doc(db, 'users', uid, 'progress', `${key}~${b.slug}`));
    return ((snap.get('mastered') as string[] | undefined) ?? []).length;
  }));
  const score = sizes.reduce((s, n) => s + n, 0);
  if (!score) return;
  await setDoc(boardRef('all', uid, key), { name, score, at: serverTimestamp() });
}

/** Leaves every board (a hidden or deleted player). */
export function removeFromBoards(uid: string, key: string) {
  return Promise.all([...BOOKS.map((b) => b.slug), 'all'].map((b) => deleteDoc(boardRef(b, uid, key))));
}
