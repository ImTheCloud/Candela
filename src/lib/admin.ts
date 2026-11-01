import { addDoc, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, serverTimestamp, updateDoc, type Timestamp } from 'firebase/firestore';
import { removeFromBoards, updatePlayerBoardName } from './board';
import { BOOKS } from './books';
import { db } from './firebase';

export interface Kid {
  key: string;
  name: string;
  score?: number;
}

export interface UserRow {
  uid: string;
  name: string;
  email: string;
  isParent: boolean;
  admin: boolean;
  at: Timestamp | null;
  /** Last visit to this version (noted once a day); null when they have not come yet. */
  seen: Timestamp | null;
  kids: Kid[];
  score?: number;
  totalScore?: number;
}

/** Every account with its children and scores. Parallel reads. For admins only. */
export async function loadUsers(): Promise<UserRow[]> {
  const [users, kids, b1, b2] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collectionGroup(db, 'players')),
    getDocs(collection(db, 'boards', '1-samuel', 'players')).catch(() => null),
    getDocs(collection(db, 'boards', '2-samuel', 'players')).catch(() => null),
  ]);

  const scoresByPlayer = new Map<string, number>();
  const addBoardDoc = (d: { id: string; get: (f: string) => unknown }) => {
    const s = Number(d.get('score')) || 0;
    scoresByPlayer.set(d.id, (scoresByPlayer.get(d.id) ?? 0) + s);
  };
  b1?.docs.forEach(addBoardDoc);
  b2?.docs.forEach(addBoardDoc);

  // "players" is also the name of the board collections: only the ones under an account are children
  const kidsOf = new Map<string, Kid[]>();
  for (const d of kids.docs) {
    const owner = d.ref.parent.parent;
    if (!owner || owner.parent.id !== 'users') continue;
    const list = kidsOf.get(owner.id) ?? [];
    const kidKey = d.id;
    const kidScore = scoresByPlayer.get(`${owner.id}~${kidKey}`) ?? 0;
    list.push({ key: kidKey, name: (d.get('name') as string) || '?', score: kidScore });
    kidsOf.set(owner.id, list);
  }

  return users.docs
    .map((d) => {
      const uid = d.id;
      const userKids = kidsOf.get(uid) ?? [];
      const userScore = scoresByPlayer.get(`${uid}~${uid}`) ?? 0;
      const kidsScore = userKids.reduce((sum, k) => sum + (k.score ?? 0), 0);
      return {
        uid,
        name: (d.get('name') as string) || '(fără nume)',
        email: (d.get('email') as string) || '',
        isParent: d.get('isParent') === true,
        admin: d.get('admin') === true,
        at: (d.get('createdAt') as Timestamp | undefined) ?? null,
        seen: (d.get('lastSeen') as Timestamp | undefined) ?? null,
        kids: userKids,
        score: userScore,
        totalScore: userScore + kidsScore,
      };
    })
    .sort((a, b) => (b.seen?.toMillis() ?? 0) - (a.seen?.toMillis() ?? 0));
}

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

export async function updateUser(uid: string, data: { name: string; isParent: boolean; admin: boolean }) {
  const name = clean(data.name);
  await updateDoc(doc(db, 'users', uid), { ...data, name });
  try {
    await updatePlayerBoardName(uid, uid, name);
    const parentParts = name.trim().split(/\s+/).filter(Boolean);
    const parentLast = parentParts[0];
    if (parentLast) {
      const snap = await getDocs(collection(db, 'users', uid, 'players'));
      await Promise.all(
        snap.docs.map(async (kd) => {
          const kname = (kd.data().name as string | undefined) ?? '';
          const kp = kname.trim().split(/\s+/).filter(Boolean);
          const childFirst = kp.length > 1 ? kp.slice(1).join(' ') : kp[0];
          const kfull = `${parentLast} ${childFirst}`;
          await updatePlayerBoardName(uid, kd.id, kfull);
        })
      );
    }
  } catch (e) {
    console.warn('Could not sync board names for user update', e);
  }
}

export function addChildTo(uid: string, name: string) {
  return addDoc(collection(db, 'users', uid, 'players'), { name: clean(name), createdAt: serverTimestamp() });
}

export async function renameChild(uid: string, key: string, name: string) {
  const cleaned = clean(name);
  await updateDoc(doc(db, 'users', uid, 'players', key), { name: cleaned });
  try {
    const parts = cleaned.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      await updatePlayerBoardName(uid, key, cleaned);
    } else {
      const userSnap = await getDoc(doc(db, 'users', uid));
      const parentName = (userSnap.data()?.name as string | undefined) ?? '';
      const parentParts = parentName.trim().split(/\s+/).filter(Boolean);
      const parentLast = parentParts[0];
      const fullName = parentLast ? `${parentLast} ${parts[0]}` : parts[0];
      await updatePlayerBoardName(uid, key, fullName);
    }
  } catch (e) {
    console.warn('Could not sync board name for child rename', e);
  }
}

/** A player's progress and board entries. */
async function wipePlayer(uid: string, key: string) {
  await removeFromBoards(uid, key);
  await Promise.all(BOOKS.map((b) => deleteDoc(doc(db, 'users', uid, 'progress', `${key}~${b.slug}`))));
}

export async function deleteChild(uid: string, key: string) {
  await wipePlayer(uid, key);
  await deleteDoc(doc(db, 'users', uid, 'players', key));
}

/**
 * Everything the site keeps about an account: children, progress, boards, the v1 archive, the profile.
 * The sign-in itself (email and password) lives in Firebase Authentication, which only the console can delete.
 */
export async function deleteAccount(r: UserRow) {
  for (const k of r.kids) await deleteChild(r.uid, k.key);
  await wipePlayer(r.uid, r.uid);
  const archive = await getDocs(collection(db, 'users', r.uid, 'archive'));
  await Promise.all(archive.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'users', r.uid));
}
