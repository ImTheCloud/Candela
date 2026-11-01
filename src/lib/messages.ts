import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, type Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { profile, user } from './session';

export interface Message {
  id: string;
  uid: string;
  by: string;
  email: string;
  message: string;
  done: boolean;
  at: Timestamp | null;
}

/** Sends a contact message to the admins from the current signed-in user. */
export async function sendMessage(text: string) {
  const u = user.value;
  if (!u) throw new Error('not_signed_in');
  const clean = text.trim();
  if (!clean) throw new Error('message_empty');
  if (clean.length > 3000) throw new Error('message_too_long');

  const name = profile.value?.name || u.displayName || 'Anonim';
  const email = u.email || profile.value?.email || '';

  return addDoc(collection(db, 'messages'), {
    uid: u.uid,
    by: name.slice(0, 80),
    email: email.slice(0, 120),
    message: clean,
    done: false,
    at: serverTimestamp(),
  });
}

/** Watches the count of unread / pending messages for the admin badge. */
export function watchOpenMessagesCount(cb: (n: number) => void) {
  return onSnapshot(
    query(collection(db, 'messages'), where('done', '==', false)),
    (snap) => cb(snap.size),
    () => cb(0),
  );
}

/** Watches all messages newest first, for the admin messages page. */
export function watchMessages(cb: (m: Message[]) => void, onError: (e: unknown) => void) {
  return onSnapshot(
    query(collection(db, 'messages'), orderBy('at', 'desc'), limit(300)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, 'id'>) }))),
    onError,
  );
}

/** Marks a message as done/resolved. */
export function setMessageDone(id: string, done: boolean) {
  return updateDoc(doc(db, 'messages', id), { done });
}

/** Deletes a message. */
export function removeMessage(id: string) {
  return deleteDoc(doc(db, 'messages', id));
}
