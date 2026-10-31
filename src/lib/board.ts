import { deleteDoc, doc, serverTimestamp, setDoc, type WriteBatch } from 'firebase/firestore';
import { LEVEL_KEY, LEVELS, type Level } from './age';
import { BOOKS } from './books';
import { db } from './firebase';

/**
 * Public board of a book (everyone reads it, the account writes its own players):
 *   boards/{book}/players/{uid}~{playerKey}  { name, score, lv, at }
 *     score  questions known in the book (checked by the rules against the progress)
 *     lv     known per level  {a: 12, c: 30}  -> the board of one level
 * Each known question counts once (the ids in `mastered`: "1sa.5.14-15.7" = book, chapter, level, number).
 */
export interface BoardFields {
  score: number;
  lv: Record<string, number>;
}

const KNOWN = new Set<string>(LEVELS.map((l) => l.id));

export function boardFields(mastered: string[]): BoardFields {
  // every level is there, at 0 if need be: a level's board only lists entries that have its field
  const lv: BoardFields['lv'] = Object.fromEntries(LEVELS.map((l) => [LEVEL_KEY[l.id], 0]));
  for (const id of new Set(mastered)) {
    const lvl = id.split('.')[2];
    if (!KNOWN.has(lvl)) continue;
    const k = LEVEL_KEY[lvl as Level];
    lv[k] = (lv[k] ?? 0) + 1;
  }
  return { score: new Set(mastered).size, lv };
}

export const boardRef = (book: string, uid: string, key: string) => doc(db, 'boards', book, 'players', `${uid}~${key}`);

/** The player's entry in a book's board (in a batch, or on its own). */
export function writeBoard(book: string, uid: string, key: string, name: string, mastered: string[], batch?: WriteBatch) {
  const data = { name, ...boardFields(mastered), at: serverTimestamp() };
  return batch ? batch.set(boardRef(book, uid, key), data) : setDoc(boardRef(book, uid, key), data);
}

/** Leaves the boards (a hidden or deleted player). "all" is an old board that no longer exists. */
export function removeFromBoards(uid: string, key: string) {
  return Promise.all([...BOOKS.map((b) => b.slug), 'all'].map((b) => deleteDoc(boardRef(b, uid, key))));
}
