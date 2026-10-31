import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut } from 'firebase/auth';
import {
  addDoc, collection, collectionGroup, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc, type Timestamp,
} from 'firebase/firestore';
import { removeFromBoards } from './board';
import { BOOKS } from './books';
import { auth, db, emulators, firebaseConfig } from './firebase';
import type { Progress } from './progress';

export interface BookStats { slug: string; name: string; mastered: number; wrong: number; chapters: number; exams: number }

export interface Kid { key: string; name: string; books: BookStats[] }

export interface UserRow {
  uid: string;
  name: string;
  email: string;
  isParent: boolean;
  hidden: boolean;
  admin: boolean;
  at: Timestamp | null;
  books: BookStats[];
  kids: Kid[];
}

/**
 * Every account with its children and their progress, newest first (accounts from the migration have no date and come last).
 * Three reads in all (accounts, every child, every progress), however many people there are. For admins only.
 */
export async function loadUsers(): Promise<UserRow[]> {
  const [users, kids, progress] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collectionGroup(db, 'players')),
    getDocs(collectionGroup(db, 'progress')),
  ]);
  // progress documents are users/{uid}/progress/{playerKey}~{book}
  const prog = new Map<string, Partial<Progress>>();
  for (const d of progress.docs) prog.set(`${d.ref.parent.parent!.id}/${d.id}`, d.data() as Partial<Progress>);
  const stats = (uid: string, key: string): BookStats[] => BOOKS.map((b) => {
    const data = prog.get(`${uid}/${key}~${b.slug}`);
    const exams = Object.keys(data?.exams ?? {});
    return {
      slug: b.slug,
      name: b.name,
      mastered: data?.mastered?.length ?? 0,
      wrong: data?.wrong?.length ?? 0,
      chapters: exams.filter((id) => /^c\d+/.test(id)).length,
      exams: exams.filter((id) => !/^c\d+/.test(id)).length,
    };
  });
  // "players" is also the name of the board collections: only the ones under an account are children
  const kidsOf = new Map<string, Kid[]>();
  for (const d of kids.docs) {
    const owner = d.ref.parent.parent;
    if (!owner || owner.parent.id !== 'users') continue;
    const list = kidsOf.get(owner.id) ?? [];
    list.push({ key: d.id, name: (d.get('name') as string) || '?', books: stats(owner.id, d.id) });
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
      books: stats(d.id, d.id),
      kids: kidsOf.get(d.id) ?? [],
    }))
    .sort((a, b) => (b.at?.toMillis() ?? 0) - (a.at?.toMillis() ?? 0));
}

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

export function updateUser(uid: string, data: { name: string; isParent: boolean; hidden: boolean; admin: boolean }) {
  return updateDoc(doc(db, 'users', uid), { ...data, name: clean(data.name) });
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

export interface NewAccount { firstName: string; lastName: string; email: string; isParent: boolean; kids: string[] }

/**
 * Creates someone's account without signing the admin out (a second, throwaway Firebase app does the sign-up),
 * then emails them a link to choose their own password.
 */
export async function createAccount(f: NewAccount) {
  const email = f.email.trim();
  const temp = initializeApp(firebaseConfig, `admin-${Date.now()}`);
  try {
    const tempAuth = getAuth(temp);
    if (emulators) connectAuthEmulator(tempAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const password = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(36)).join('');
    const cred = await createUserWithEmailAndPassword(tempAuth, email, password);
    await signOut(tempAuth);
    const uid = cred.user.uid;
    await setDoc(doc(db, 'users', uid), {
      name: `${clean(f.firstName)} ${clean(f.lastName)}`,
      email: cred.user.email,
      birthYear: null,
      isParent: f.isParent,
      hidden: false,
      createdAt: serverTimestamp(),
    });
    if (f.isParent) for (const k of f.kids.map(clean).filter(Boolean)) await addChildTo(uid, k);
    await sendPasswordResetEmail(auth, email);
  } finally {
    await deleteApp(temp);
  }
}
