import { addDoc, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, serverTimestamp, updateDoc, type Timestamp } from 'firebase/firestore';
import { removeFromBoards, updatePlayerBoardName } from './board';
import { BOOKS } from './books';
import { db } from './firebase';

export interface Kid { key: string; name: string }

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
}

/** Every account with its children, newest first (accounts from the migration have no date and come last). Two reads in all. For admins only. */
export async function loadUsers(): Promise<UserRow[]> {
  const [users, kids] = await Promise.all([getDocs(collection(db, 'users')), getDocs(collectionGroup(db, 'players'))]);
  // "players" is also the name of the board collections: only the ones under an account are children
  const kidsOf = new Map<string, Kid[]>();
  for (const d of kids.docs) {
    const owner = d.ref.parent.parent;
    if (!owner || owner.parent.id !== 'users') continue;
    const list = kidsOf.get(owner.id) ?? [];
    list.push({ key: d.id, name: (d.get('name') as string) || '?' });
    kidsOf.set(owner.id, list);
  }
  return users.docs
    .map((d) => ({
      uid: d.id,
      name: (d.get('name') as string) || '(fără nume)',
      email: (d.get('email') as string) || '',
      isParent: d.get('isParent') === true,
      admin: d.get('admin') === true,
      at: (d.get('createdAt') as Timestamp | undefined) ?? null,
      seen: (d.get('lastSeen') as Timestamp | undefined) ?? null,
      kids: kidsOf.get(d.id) ?? [],
    }))
    .sort((a, b) => (b.at?.toMillis() ?? 0) - (a.at?.toMillis() ?? 0));
}

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

export async function updateUser(uid: string, data: { name: string; isParent: boolean; admin: boolean }) {
  const name = clean(data.name);
  await updateDoc(doc(db, 'users', uid), { ...data, name });
  try {
    await updatePlayerBoardName(uid, uid, name);
    const parentParts = name.trim().split(/\s+/);
    const parentLast = parentParts.slice(1).join(' ');
    if (parentLast) {
      const snap = await getDocs(collection(db, 'users', uid, 'players'));
      await Promise.all(
        snap.docs.map(async (kd) => {
          const kname = (kd.data().name as string | undefined) ?? '';
          const kp = kname.trim().split(/\s+/);
          const kfull = kp.length > 1 ? kname.trim() : `${kp[0]} ${parentLast}`;
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
    const parts = cleaned.trim().split(/\s+/);
    if (parts.length > 1) {
      await updatePlayerBoardName(uid, key, cleaned);
    } else {
      const userSnap = await getDoc(doc(db, 'users', uid));
      const parentName = (userSnap.data()?.name as string | undefined) ?? '';
      const parentParts = parentName.trim().split(/\s+/);
      const parentLast = parentParts.slice(1).join(' ');
      const fullName = parentLast ? `${parts[0]} ${parentLast}` : parts[0];
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
