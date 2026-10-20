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

// users/{uid}: the adult account. Children live in users/{uid}/players (added in a later step).
export interface Profile {
  name: string;
  email: string;
  birthYear: number | null;
  isParent: boolean;
  hidden: boolean;
}

/** undefined while Firebase restores the session, null when signed out. */
export const user = signal<User | null | undefined>(undefined);
export const profile = signal<Profile | null>(null);
/** False until the signed-in user's profile has been read (or failed to). */
export const profileLoaded = signal(false);
/** True when the profile could not be read (offline, rules, Firestore unavailable). */
export const profileError = signal(false);

let stopProfile: (() => void) | null = null;

onAuthStateChanged(auth, (u) => {
  user.value = u;
  stopProfile?.();
  stopProfile = null;
  profile.value = null;
  profileLoaded.value = false;
  profileError.value = false;
  if (!u) return;
  stopProfile = onSnapshot(
    doc(db, 'users', u.uid),
    (snap) => {
      profile.value = snap.exists() ? (snap.data() as Profile) : null;
      profileLoaded.value = true;
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
  birthYear: number;
  isParent: boolean;
}

export async function signUp(f: SignUp): Promise<void> {
  const name = `${clean(f.firstName)} ${clean(f.lastName)}`;
  const cred = await createUserWithEmailAndPassword(auth, f.email.trim(), f.password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, 'users', cred.user.uid), {
    name,
    email: cred.user.email,
    birthYear: f.birthYear,
    isParent: f.isParent,
    hidden: false,
    createdAt: serverTimestamp(),
  });
}

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function signOut() {
  return fbSignOut(auth);
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

/** Also creates the profile when it is missing (an account whose profile was never written). */
export function setBirthYear(birthYear: number) {
  const u = auth.currentUser;
  if (!u) throw new Error('not_signed_in');
  if (profile.value) return updateDoc(doc(db, 'users', u.uid), { birthYear });
  return setDoc(doc(db, 'users', u.uid), {
    name: u.displayName ?? '',
    email: u.email,
    birthYear,
    isParent: false,
    hidden: false,
    createdAt: serverTimestamp(),
  });
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
