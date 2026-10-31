import { signal } from '@preact/signals';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { localGet, localRemove, localSet } from './store';

// users/{uid}: the adult account. Children live in users/{uid}/players (added in a later step).
export interface Profile {
  name: string;
  email: string;
  birthYear: number | null;
  isParent: boolean;
  hidden: boolean;
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
  // the admin page shows when each account last came: noted once a day
  const today = new Date().toDateString();
  if (localGet<string | null>(`seen:${u.uid}`, null) !== today) {
    updateDoc(doc(db, 'users', u.uid), { lastSeen: serverTimestamp() })
      .then(() => localSet(`seen:${u.uid}`, today))
      .catch(() => {});
  }
  stopProfile = onSnapshot(
    doc(db, 'users', u.uid),
    (snap) => {
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

export interface SignUp {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isParent: boolean;
}

export async function signUp(f: SignUp): Promise<void> {
  const name = `${clean(f.firstName)} ${clean(f.lastName)}`;
  const cred = await createUserWithEmailAndPassword(auth, f.email.trim(), f.password);
  await updateProfile(cred.user, { displayName: name });
  rememberSignedIn(cred.user);
  await setDoc(doc(db, 'users', cred.user.uid), {
    name,
    email: cred.user.email,
    birthYear: null,
    isParent: f.isParent,
    hidden: false,
    createdAt: serverTimestamp(),
  });
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

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function setParent(isParent: boolean) {
  const u = auth.currentUser;
  if (!u) throw new Error('not_signed_in');
  return updateDoc(doc(db, 'users', u.uid), { isParent });
}

function clean(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/** Romanian message for a Firebase error. */
export function errorText(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email': return 'Adresa de email nu este validă.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Emailul sau parola nu sunt corecte.';
    case 'auth/email-already-in-use': return 'Există deja un cont cu acest email.';
    case 'auth/weak-password': return 'Parola trebuie să aibă cel puțin 6 caractere.';
    case 'auth/too-many-requests': return 'Prea multe încercări. Încearcă din nou peste câteva minute.';
    case 'auth/network-request-failed': return 'Nu există conexiune la internet.';
    case 'permission-denied': return 'Nu ai voie să faci această modificare.';
    default: return 'A apărut o eroare. Încearcă din nou.';
  }
}
