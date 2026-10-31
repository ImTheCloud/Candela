import { addDoc, collection, collectionGroup, deleteDoc, doc, getDocs, serverTimestamp, updateDoc, type Timestamp } from 'firebase/firestore';
import { removeFromBoards } from './board';
import { BOOKS } from './books';
import { db } from './firebase';

export interface Kid { key: string; name: string }

export interface UserRow {
  uid: string;
  name: string;
  email: string;
  isParent: boolean;
  hidden: boolean;
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
      hidden: d.get('hidden') === true,
      admin: d.get('admin') === true,
      at: (d.get('createdAt') as Timestamp | undefined) ?? null,
      seen: (d.get('lastSeen') as Timestamp | undefined) ?? null,
      kids: kidsOf.get(d.id) ?? [],
    }))
    .sort((a, b) => (b.at?.toMillis() ?? 0) - (a.at?.toMillis() ?? 0));
}

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

/** Hiding an account also takes it off the boards (its own client only writes the boards while it is visible). */
export async function updateUser(uid: string, data: { name: string; isParent: boolean; hidden: boolean; admin: boolean }) {
  await updateDoc(doc(db, 'users', uid), { ...data, name: clean(data.name) });
  if (data.hidden) await removeFromBoards(uid, uid);
}

export function addChildTo(uid: string, name: string) {
  return addDoc(collection(db, 'users', uid, 'players'), { name: clean(name), createdAt: serverTimestamp() });
}

export function renameChild(uid: string, key: string, name: string) {
  return updateDoc(doc(db, 'users', uid, 'players', key), { name: clean(name) });
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
