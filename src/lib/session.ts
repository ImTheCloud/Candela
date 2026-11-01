import { signal } from '@preact/signals';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { removeFromBoards, updatePlayerBoardName } from './board';
import { auth, db } from './firebase';
import { localGet, localRemove, localSet } from './store';

// users/{uid}: the adult account. Children live in users/{uid}/players (added in a later step).
export interface Profile {
  name: string;
  email: string;
  birthYear: number | null;
  isParent: boolean;
  /** Can read the reports; set only from the Firebase console or the migration. */
  admin?: boolean;
}

/** What the last visit left behind: lets a page show the name and profile before Firebase has restored the session. */
interface Remembered { uid: string; profile: Profile | null; name: string }
const remembered = localGet<Remembered | null>('me', null);

/** undefined while Firebase restores the session, null when signed out. */
export const user = signal<User | null | undefined>(undefined);
export const profile = signal<Profile | null>(remembered?.profile ?? null);
/** The account of the last visit, valid only while `user` is still undefined. */
export const rememberedAccount = remembered;
/** False until the signed-in user's profile has been read (or failed to). */
export const profileLoaded = signal(false);
/** True when the profile could not be read (offline, rules, Firestore unavailable). */
export const profileError = signal(false);

let stopProfile: (() => void) | null = null;

/** html.signed-in: what the CSS needs to know (the account page shows its back button only when signed in). Page swaps replace the html attributes. */
const markSignedIn = () => document.documentElement.classList.toggle('signed-in', user.value ? true : user.value === undefined && !!remembered);
document.addEventListener('astro:after-swap', markSignedIn);

onAuthStateChanged(auth, (u) => {
  user.value = u;
  markSignedIn();
  stopProfile?.();
  stopProfile = null;
  // the remembered profile stays on screen until the real one arrives, if it is the same account
  if (u?.uid !== remembered?.uid) profile.value = null;
  profileLoaded.value = false;
  profileError.value = false;
  if (!u) {
    localRemove('me');
    // the whole site is played from an account: signed out, every page but the account pages goes to sign-in
    if (!location.pathname.startsWith('/cont')) location.replace(signInHref());
    return;
  }
  if (!localGet<Remembered | null>('me', null)) rememberSignedIn(u);
  stopProfile = onSnapshot(
    doc(db, 'users', u.uid),
    (snap) => {
      // the admin page shows when each account last came: noted once a day, only once the profile exists
      // (an update before sign-up has written it is refused, and takes the sign-up's own writes down with it)
      if (snap.exists() && !snap.metadata.hasPendingWrites) noteSeen(u.uid);
      profile.value = snap.exists() ? (snap.data() as Profile) : null;
      profileLoaded.value = true;
      localSet('me', { uid: u.uid, profile: profile.value, name: profile.value?.name || u.displayName || '' } satisfies Remembered);
    },
    () => {
      profile.value = null;
      profileError.value = true;
      profileLoaded.value = true;
    },
  );
});

let seenAsked = '';
function noteSeen(uid: string) {
  const today = new Date().toDateString();
  const key = `seen:${uid}`;
  if (seenAsked === `${uid}:${today}` || localGet<string | null>(key, null) === today) return;
  seenAsked = `${uid}:${today}`;
  updateDoc(doc(db, 'users', uid), { lastSeen: serverTimestamp() })
    .then(() => localSet(key, today))
    .catch(() => { seenAsked = ''; });
}

export interface SignUp {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isParent: boolean;
}

export async function signUp(f: SignUp): Promise<void> {
  const last = clean(f.lastName);
  const first = clean(f.firstName) || 'Familia';
  const name = `${last} ${first}`.trim();
  const cred = await createUserWithEmailAndPassword(auth, f.email.trim(), f.password);
  await updateProfile(cred.user, { displayName: name });
  rememberSignedIn(cred.user);
  await setDoc(doc(db, 'users', cred.user.uid), {
    name,
    email: cred.user.email,
    birthYear: null,
    isParent: f.isParent,
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
  });
  localSet(`seen:${cred.user.uid}`, new Date().toDateString());
}

export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  rememberSignedIn(cred.user);
  return cred;
}

/** The sign-in page, coming back to this page afterwards. */
export function signInHref(): string {
  return `/cont?next=${encodeURIComponent(location.pathname + location.search)}`;
}

/** Marks the visit as signed in at once, before the profile is read: the layout sends visitors without it to sign-in. */
function rememberSignedIn(u: User) {
  if (localGet<Remembered | null>('me', null)?.uid !== u.uid) localSet('me', { uid: u.uid, profile: null, name: u.displayName ?? '' } satisfies Remembered);
}

export function signOut() {
  return fbSignOut(auth);
}

/**
 * Permanently deletes the user's account:
 * 1. Children docs and leaderboard entries
 * 2. Progress and board records
 * 3. Firestore user document
 * 4. Firebase Auth user
 * 5. Local cache
 */
export async function deleteMyAccount(password?: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('not_signed_in');
  const uid = u.uid;

  // Re-authenticate if password was supplied, ensuring fresh credentials so deleteUser() never fails with requires-recent-login
  if (password && u.email) {
    const cred = EmailAuthProvider.credential(u.email, password);
    await reauthenticateWithCredential(u, cred);
  }

  // Detach profile listener so it doesn't write lastSeen or trigger updates during deletion
  stopProfile?.();
  stopProfile = null;

  // 1. Delete all children player docs and remove them from leaderboards
  try {
    const kidsSnap = await getDocs(collection(db, 'users', uid, 'players'));
    for (const kidDoc of kidsSnap.docs) {
      await removeFromBoards(uid, kidDoc.id).catch(() => {});
      await deleteDoc(kidDoc.ref).catch(() => {});
    }
  } catch (err) {
    console.warn('Could not clean up children on account deletion:', err);
  }

  // 2. Remove parent from leaderboards
  await removeFromBoards(uid, uid).catch(() => {});

  // 3. Delete progress docs for parent and children
  try {
    const progSnap = await getDocs(collection(db, 'users', uid, 'progress'));
    for (const pDoc of progSnap.docs) {
      await deleteDoc(pDoc.ref).catch(() => {});
    }
  } catch (err) {
    console.warn('Could not clean up progress on account deletion:', err);
  }

  // 4. Delete legacy v1 archive docs if present
  try {
    const archiveSnap = await getDocs(collection(db, 'users', uid, 'archive'));
    for (const aDoc of archiveSnap.docs) {
      await deleteDoc(aDoc.ref).catch(() => {});
    }
  } catch (err) {
    console.warn('Could not clean up archive on account deletion:', err);
  }

  // 5. Delete the user document in Firestore
  await deleteDoc(doc(db, 'users', uid)).catch((err) => {
    console.warn('Could not delete user doc:', err);
    throw err;
  });

  // 6. Delete the Auth user
  await deleteUser(u);

  // 7. Local storage cleanup
  localRemove('me');
  localRemove('kids');
  localRemove('player');
  localRemove(`seen:${uid}`);
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function setParent(isParent: boolean) {
  const u = auth.currentUser;
  if (!u) throw new Error('not_signed_in');
  return updateDoc(doc(db, 'users', u.uid), { isParent });
}

export async function updateAccountName(firstName: string, lastName: string): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error('not_signed_in');
  const first = clean(firstName) || 'Familia';
  const last = clean(lastName);
  if (!last) throw new Error('name_required');
  const name = `${last} ${first}`.trim();
  if (name.length > 80) throw new Error('name_too_long');

  // Optimistically update local profile and storage
  if (profile.value) {
    profile.value = { ...profile.value, name };
  }
  const remembered = localGet<Remembered | null>('me', null);
  if (remembered && remembered.uid === u.uid) {
    localSet('me', {
      ...remembered,
      name,
      profile: profile.value ? { ...profile.value, name } : null,
    } satisfies Remembered);
  }

  // Update Firestore user document (offline-first, with 600ms safeguard so UI closes quickly)
  await Promise.race([
    updateDoc(doc(db, 'users', u.uid), { name }),
    new Promise((resolve) => setTimeout(resolve, 600)),
  ]).catch((err) => {
    console.warn('Firestore user update deferred/failed:', err);
  });

  // Update Firebase Auth displayName in background (never blocks the UI)
  updateProfile(u, { displayName: name }).catch(() => {});

  // Update leaderboard entries in the background
  try {
    await updatePlayerBoardName(u.uid, u.uid, name);

    // Also update all children on leaderboards if parent has children: "LastName ChildFirstName"
    const kidsSnap = await getDocs(collection(db, 'users', u.uid, 'players')).catch(() => null);
    if (kidsSnap && !kidsSnap.empty) {
      await Promise.all(
        kidsSnap.docs.map(async (kd) => {
          const kname = (kd.data().name as string | undefined) ?? '';
          const kp = kname.trim().split(/\s+/).filter(Boolean);
          const childFirst = kp.length > 1 ? kp.slice(1).join(' ') : kp[0];
          const kfull = `${last} ${childFirst}`;
          await updatePlayerBoardName(u.uid, kd.id, kfull);
        })
      );
    } else {
      const kidsCache = localGet<{ uid: string; list: { key: string; name: string }[] } | null>('kids', null);
      if (kidsCache && kidsCache.uid === u.uid) {
        await Promise.all(
          kidsCache.list.map(async (k) => {
            const childParts = k.name.trim().split(/\s+/).filter(Boolean);
            const childFirst = childParts.length > 1 ? childParts.slice(1).join(' ') : childParts[0];
            const childFull = `${last} ${childFirst}`;
            await updatePlayerBoardName(u.uid, k.key, childFull);
          })
        );
      }
    }
  } catch {
    // ignore
  }

  return name;
}

function clean(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/** Romanian message for a Firebase error. */
export function errorText(e: unknown): string {
  const code = (e as { code?: string; message?: string })?.code ?? (e as { message?: string })?.message ?? '';
  switch (code) {
    case 'name_required': return 'Scrie prenumele și numele de familie.';
    case 'name_too_long': return 'Numele este prea lung (maximum 80 de caractere).';
    case 'message_empty': return 'Mesajul nu poate fi gol.';
    case 'message_too_long': return 'Mesajul este prea lung (maximum 3000 de caractere).';
    case 'auth/invalid-email': return 'Adresa de email nu este validă.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Emailul sau parola nu sunt corecte.';
    case 'auth/email-already-in-use': return 'Există deja un cont cu acest email.';
    case 'auth/weak-password': return 'Parola trebuie să aibă cel puțin 6 caractere.';
    case 'auth/too-many-requests': return 'Prea multe încercări. Încearcă din nou peste câteva minute.';
    case 'auth/network-request-failed': return 'Nu există conexiune la internet.';
    case 'auth/requires-recent-login': return 'Această operațiune necesită o conectare recentă. Te rugăm să ieși din cont, să te conectezi din nou și să reîncerci.';
    case 'permission-denied': return 'Nu ai voie să faci această modificare.';
    default: return 'A apărut o eroare. Încearcă din nou.';
  }
}
